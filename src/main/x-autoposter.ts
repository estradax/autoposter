import { BrowserWindow, ipcMain } from 'electron'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Browser, Page } from 'puppeteer'
import { BrowserManager } from './browser-manager'
import { db } from './database/database'
import { xBotConfigs } from './database/schema'
import { eq } from 'drizzle-orm'

try {
  puppeteer.use(StealthPlugin())
} catch {
  // Ignore if already registered
}

interface CookieParam {
  name: string
  value: string
  domain: string
  path: string
  httpOnly?: boolean
  secure?: boolean
  expires?: number
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export class XAutoposter {
  private static isRunning = false
  private static stopRequested = false
  private static activeBrowser: Browser | null = null
  private static activePromise: Promise<void> | null = null

  static registerHandlers(): void {
    ipcMain.handle('x:save-settings', async (_, settings) => {
      const existing = await db.select().from(xBotConfigs).limit(1)
      if (existing.length > 0) {
        await db.update(xBotConfigs).set(settings).where(eq(xBotConfigs.id, existing[0].id))
      } else {
        await db.insert(xBotConfigs).values(settings)
      }
    })

    ipcMain.handle('x:get-settings', async () => {
      const existing = await db.select().from(xBotConfigs).limit(1)
      return existing[0] || null
    })

    ipcMain.handle('x:start-autopost', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) throw new Error('No window found')
      return await this.run(window)
    })

    ipcMain.handle('x:stop-autopost', async () => {
      this.stopRequested = true
      if (this.activeBrowser) {
        try {
          await this.activeBrowser.close()
        } catch {
          // ignore
        }
        this.activeBrowser = null
      }
      this.isRunning = false
      this.activePromise = null
    })
  }

  static async run(mainWindow: BrowserWindow): Promise<void> {
    if (this.isRunning) {
      if (this.activePromise) {
        return this.activePromise
      }
      throw new Error('Automation is already running')
    }

    this.isRunning = true
    this.stopRequested = false

    this.activePromise = (async () => {
      const sendLog = (message: string): void => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('x:log', message)
        }
      }

      try {
        // 1. Fetch configurations
        sendLog('Fetching configuration from database...')
        const configs = await db.select().from(xBotConfigs).limit(1)
        const config = configs[0]
        if (!config) {
          throw new Error('No configuration found. Please save your settings first.')
        }

        // 2. Get Chromium path
        sendLog('Resolving Chromium executable path...')
        const exePath = await BrowserManager.getExecutablePath()
        const isInstalled = await BrowserManager.isInstalled()
        if (!isInstalled || !exePath) {
          throw new Error('Chromium is not installed. Please download it first.')
        }

        sendLog(`Launching Chromium from: ${exePath}`)

        // 3. Launch Puppeteer
        const browser = await puppeteer.launch({
          executablePath: exePath,
          headless: false,
          args: ['--start-maximized'],
          defaultViewport: null
        })
        this.activeBrowser = browser

        if (this.stopRequested) throw new Error('Stop requested')

        const [page] = await browser.pages()

        // 4. Apply Session (Cookies & localStorage)
        sendLog('Applying cookies and local storage items...')
        await this.applySession(browser, page, config.cookies, config.localStorage, sendLog)

        if (this.stopRequested) throw new Error('Stop requested')

        // 5. Navigate to search URL
        const searchUrl = `https://x.com/search?q=${encodeURIComponent(config.searchQuery)}&src=typed_query&f=top`
        sendLog(`Navigating to search URL: ${searchUrl}`)
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2'
        })

        if (this.stopRequested) throw new Error('Stop requested')

        // Wait for the timeline to load
        sendLog('Waiting for timeline to load...')
        try {
          await page.waitForSelector('article[data-testid="tweet"]', {
            timeout: 15000
          })
        } catch (error) {
          throw new Error(
            'Could not find any tweets in the timeline. Make sure you are logged in and search returned results.'
          )
        }

        const processedTweetIds = new Set<string>()
        const maxReplies = 50
        let totalReplied = 0
        const tweetSelector = 'article[data-testid="tweet"]'

        while (totalReplied < maxReplies) {
          if (this.stopRequested) throw new Error('Stop requested')

          const currentTweets = await page.$$(tweetSelector)
          sendLog(
            `Currently visible: ${currentTweets.length} tweets. Total replied: ${totalReplied}/${maxReplies}`
          )

          for (const tweet of currentTweets) {
            if (this.stopRequested) throw new Error('Stop requested')

            const isAttached = await tweet.evaluate((node) => node.isConnected)
            if (!isAttached) continue

            const tweetId = await tweet.evaluate((el) => {
              const timeEl = el.querySelector('time')
              return timeEl ? timeEl.closest('a')?.getAttribute('href') : null
            })

            if (!tweetId || processedTweetIds.has(tweetId)) continue

            sendLog(`Processing new tweet: ${tweetId}`)

            try {
              const replyButton = await tweet.$('[data-testid="reply"]')
              if (replyButton) {
                await tweet.evaluate((el) => el.scrollIntoView({ block: 'center' }))
                await new Promise((resolve) => setTimeout(resolve, 1500))
                if (this.stopRequested) throw new Error('Stop requested')

                await replyButton.click()
                sendLog('Clicked the reply button.')

                const textareaSelector = '[data-testid="tweetTextarea_0"]'
                try {
                  await page.waitForSelector(textareaSelector, {
                    visible: true,
                    timeout: 5000
                  })
                  await page.click(textareaSelector)
                  await new Promise((resolve) => setTimeout(resolve, 500))
                } catch (e) {
                  if (this.stopRequested) throw new Error('Stop requested')
                  sendLog('Reply textarea did not appear in time. Retrying click...')
                  await replyButton.click()
                  await page.waitForSelector(textareaSelector, {
                    visible: true,
                    timeout: 3000
                  })
                }

                if (this.stopRequested) throw new Error('Stop requested')

                // Parse media paths
                let mediaPaths: string[] = []
                try {
                  mediaPaths = JSON.parse(config.mediaFilePaths || '[]')
                } catch {
                  sendLog('Error parsing media files array.')
                }

                // Type text
                const randomSuffix = Math.floor(Math.random() * 1000) + 1
                const finalReplyText = `${config.postContent} ${randomSuffix}`
                sendLog(`Typing reply text: "${finalReplyText}"`)
                await page.keyboard.type(finalReplyText, { delay: 50 })
                if (this.stopRequested) throw new Error('Stop requested')

                // Handle media uploads if any
                if (mediaPaths.length > 0) {
                  sendLog(`Uploading ${mediaPaths.length} media file(s)...`)
                  const fileInput = await page.waitForSelector('input[data-testid="fileInput"]', {
                    timeout: 5000
                  })
                  if (fileInput) {
                    await fileInput.uploadFile(...mediaPaths)
                    sendLog(`Uploaded file(s) successfully. Waiting for processing...`)
                    await new Promise((resolve) => setTimeout(resolve, 5000))
                  } else {
                    sendLog('File input element not found.')
                  }
                }

                if (this.stopRequested) throw new Error('Stop requested')

                // Wait specifically for the tweet/reply button to be enabled
                sendLog('Waiting for tweet/reply button to be enabled...')
                const tweetButtonSelector =
                  '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]'

                await page.waitForFunction(
                  (selector) => {
                    const btn = document.querySelector(selector) as HTMLButtonElement
                    return btn && !btn.disabled && btn.offsetParent !== null
                  },
                  { timeout: 30000 },
                  tweetButtonSelector
                )

                if (this.stopRequested) throw new Error('Stop requested')

                const tweetButton = await page.$(tweetButtonSelector)
                if (tweetButton) {
                  await tweetButton.click()
                  sendLog(`Reply submitted successfully to: ${tweetId}`)
                  await new Promise((resolve) => setTimeout(resolve, 3000))
                } else {
                  sendLog('Tweet button not found.')
                }

                processedTweetIds.add(tweetId)
                totalReplied++

                if (totalReplied >= maxReplies) break

                const delay = 3000 + Math.random() * 3000
                sendLog(`Waiting ${Math.round(delay / 1000)}s before next tweet...`)
                await new Promise((resolve) => setTimeout(resolve, delay))
              } else {
                sendLog(`Could not find the reply button in tweet ${tweetId}.`)
              }
            } catch (err: any) {
              if (this.stopRequested || err.message.includes('Stop requested')) {
                throw new Error('Stop requested')
              }
              sendLog(`Error processing tweet: ${err.message}`)
              try {
                await page.keyboard.press('Escape')
                sendLog('Pressed Escape to clear state.')
              } catch {}
            }
          }

          if (totalReplied >= maxReplies) break

          if (this.stopRequested) throw new Error('Stop requested')

          sendLog('Scrolling down for more tweets...')
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 2)
          })

          await new Promise((resolve) => setTimeout(resolve, 4000))
        }

        sendLog('Automation completed!')
        if (browser) {
          await browser.close()
        }
      } catch (err: unknown) {
        const error = err as Error
        if (
          this.stopRequested ||
          error.message.includes('Stop requested') ||
          error.message.includes('Target closed') ||
          error.message.includes('Navigation failed')
        ) {
          sendLog('Automation stopped by user.')
        } else {
          sendLog(`Fatal Error: ${error.message}`)
          throw error
        }
      } finally {
        this.activeBrowser = null
        this.isRunning = false
        this.stopRequested = false
        this.activePromise = null
      }
    })()

    return this.activePromise
  }

  private static async applySession(
    browser: Browser,
    page: Page,
    cookiesRaw: string,
    localStorageRaw: string,
    sendLog: (msg: string) => void
  ): Promise<void> {
    try {
      const rawLines = cookiesRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)

      const processedLines: string[] = []
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i]
        if (!line) continue
        if (line.split('\t').length < 5 && i > 0 && processedLines.length > 0) {
          processedLines[processedLines.length - 1] += '\t' + line
        } else {
          processedLines.push(line)
        }
      }

      const cookies = processedLines
        .map((line) => {
          const parts = line.split('\t')
          if (parts.length < 2) return null

          const cookie: CookieParam = {
            name: parts[0],
            value: parts[1],
            domain: parts[2],
            path: parts[3]
          }

          if (parts[6] === '✓') cookie.httpOnly = true
          if (parts[7] === '✓') cookie.secure = true

          if (parts[4]) {
            const expiry = new Date(parts[4]).getTime() / 1000
            if (!isNaN(expiry)) {
              cookie.expires = expiry
            }
          }

          if (parts[8] && ['Strict', 'Lax', 'None'].includes(parts[8])) {
            cookie.sameSite = parts[8] as 'Strict' | 'Lax' | 'None'
          }

          return cookie
        })
        .filter((c): c is CookieParam => c !== null)

      if (cookies.length > 0) {
        await browser.defaultBrowserContext().setCookie(...cookies)
        sendLog(`Loaded ${cookies.length} cookies.`)
      }

      const localStorageItems = localStorageRaw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const parts = line.split('\t')
          if (parts.length < 2 || !parts[0] || !parts[1]) return null
          return { key: parts[0], value: parts[1] }
        })
        .filter((item): item is { key: string; value: string } => item !== null)

      await page.goto('https://x.com', {
        waitUntil: 'domcontentloaded'
      })

      if (localStorageItems.length > 0) {
        await page.evaluate((items) => {
          for (const item of items) {
            if (item) {
              localStorage.setItem(item.key, item.value)
            }
          }
        }, localStorageItems)
        sendLog(`Loaded ${localStorageItems.length} localStorage items.`)
      }
    } catch (err: unknown) {
      const error = err as Error
      sendLog(`Error loading session credentials: ${error.message}`)
    }
  }
}
