import { BrowserWindow, ipcMain } from 'electron'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Browser, Page, ElementHandle } from 'puppeteer'
import { BrowserManager } from './browser-manager'
import { db } from './database/database'
import { botConfigs } from './database/schema'
import { eq } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

puppeteer.use(StealthPlugin())

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

export class FBAutoposter {
  private static isRunning = false
  private static stopRequested = false
  private static activeBrowser: Browser | null = null
  private static activePromise: Promise<void> | null = null
  private static groupsSelectionResolver: ((selectedUrls: string[]) => void) | null = null

  static registerHandlers(): void {
    ipcMain.handle('fb:save-settings', async (_, settings) => {
      const existing = await db.select().from(botConfigs).limit(1)
      if (existing.length > 0) {
        await db.update(botConfigs).set(settings).where(eq(botConfigs.id, existing[0].id))
      } else {
        await db.insert(botConfigs).values(settings)
      }
    })

    ipcMain.handle('fb:get-settings', async () => {
      const existing = await db.select().from(botConfigs).limit(1)
      return existing[0] || null
    })

    ipcMain.handle('fb:get-file-data', async (_, filePath: string) => {
      try {
        const ext = path.extname(filePath).toLowerCase()
        let mimeType = 'image/jpeg'
        if (ext === '.png') mimeType = 'image/png'
        else if (ext === '.gif') mimeType = 'image/gif'
        else if (ext === '.webp') mimeType = 'image/webp'
        else if (ext === '.mp4') mimeType = 'video/mp4'
        else if (ext === '.webm') mimeType = 'video/webm'
        else if (ext === '.ogg') mimeType = 'video/ogg'
        else if (ext === '.mov') mimeType = 'video/quicktime'

        const data = await fs.promises.readFile(filePath)
        return `data:${mimeType};base64,${data.toString('base64')}`
      } catch (err) {
        console.error('Error reading file for preview:', err)
        return ''
      }
    })

    ipcMain.handle('fb:start-autopost', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) throw new Error('No window found')
      return await this.run(window)
    })

    ipcMain.handle('fb:stop-autopost', async () => {
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
      if (this.groupsSelectionResolver) {
        this.groupsSelectionResolver([])
        this.groupsSelectionResolver = null
      }
    })

    ipcMain.handle('fb:select-groups', async (_, selectedUrls: string[]) => {
      if (this.groupsSelectionResolver) {
        this.groupsSelectionResolver(selectedUrls)
        this.groupsSelectionResolver = null
      }
    })
  }

  static async run(window: BrowserWindow): Promise<void> {
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
        if (!window.isDestroyed()) {
          window.webContents.send('fb:log', message)
        }
      }

      try {
        // 1. Fetch configurations
        sendLog('Fetching configuration from database...')
        const configs = await db.select().from(botConfigs).limit(1)
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

        // 5. Navigate to groups
        sendLog('Navigating to Facebook groups joined page...')
        await page.goto('https://web.facebook.com/groups/joins/?nav_source=tab', {
          waitUntil: 'networkidle2'
        })

        if (this.stopRequested) throw new Error('Stop requested')

        // Wait for list items to load
        await page.waitForSelector('div[role="listitem"]')

        // Scroll to load all groups
        sendLog('Scrolling to load all groups...')
        let lastHeight = (await page.evaluate('document.body.scrollHeight')) as number
        while (true) {
          if (this.stopRequested) throw new Error('Stop requested')
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
          // Wait for potential new content to load
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const newHeight = (await page.evaluate('document.body.scrollHeight')) as number
          if (newHeight === lastHeight) {
            break
          }
          lastHeight = newHeight
        }

        if (this.stopRequested) throw new Error('Stop requested')

        // Extract group links and names
        const rawGroups = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[aria-label="View group"]'))
          const results: { url: string; name: string }[] = []

          for (const link of links) {
            const href = (link as HTMLAnchorElement).href
            if (!href) continue

            // Clean up url
            const match = href.match(/https?:\/\/[^\/]+\/groups\/[^\/]+/)
            const cleanUrl = match ? match[0] + '/' : href

            // Try to find the group name text.
            let name = ''
            let current: HTMLElement | null = link.parentElement

            // Traverse up to find a container with group name
            let container: HTMLElement | null = null
            for (let depth = 0; depth < 8; depth++) {
              if (!current) break
              if (current.getAttribute('role') === 'listitem' || current.tagName === 'LI') {
                container = current
                break
              }
              current = current.parentElement
            }

            if (!container) {
              container = link.parentElement
            }

            if (container) {
              // Find headings or span/anchor elements that contain the group name.
              const allElements = Array.from(container.querySelectorAll('span, a, div, h2, h3, h4'))

              for (const el of allElements) {
                const text = el.textContent?.trim() || ''
                if (!text) continue
                // Ignore action buttons or metadata
                if (
                  text === 'View group' ||
                  text === 'Joined' ||
                  text.includes('members') ||
                  text.includes('posts a day') ||
                  text.includes('Public group') ||
                  text.includes('Private group') ||
                  text.toLowerCase() === 'view group' ||
                  text === href
                ) {
                  continue
                }
                name = text
                break
              }

              // Fallback to container text content split
              if (!name) {
                const rawText = container.textContent?.trim() || ''
                if (rawText) {
                  const parts = rawText.split(/[\n·•]/)
                  if (parts[0]) {
                    name = parts[0].trim()
                  }
                }
              }
            }

            // Final fallback
            if (!name || name === 'View group') {
              name = link.textContent?.trim() || ''
            }

            results.push({ url: cleanUrl, name: name || cleanUrl })
          }

          return results
        })

        // Filter duplicates and merge names
        const uniqueGroupsMap = new Map<string, string>()
        for (const g of rawGroups) {
          if (g.url) {
            const existingName = uniqueGroupsMap.get(g.url)
            const currentName = g.name
            if (!existingName || (existingName === g.url && currentName !== g.url)) {
              uniqueGroupsMap.set(g.url, currentName || g.url)
            }
          }
        }
        const uniqueGroups = Array.from(uniqueGroupsMap.entries()).map(([url, name]) => ({
          url,
          name
        }))

        sendLog(`Found ${uniqueGroups.length} unique groups. Waiting for user selection...`)
        if (!window.isDestroyed()) {
          window.webContents.send('fb:groups-loaded', uniqueGroups)
        }

        let selectedGroupLinks: string[] = []
        try {
          selectedGroupLinks = await new Promise<string[]>((resolve) => {
            this.groupsSelectionResolver = resolve
          })
        } finally {
          this.groupsSelectionResolver = null
        }

        if (this.stopRequested) throw new Error('Stop requested')

        sendLog(
          `User selected ${selectedGroupLinks.length} groups to post to. Starting automated posting...`
        )

        // Parse media paths
        let mediaPaths: string[] = []
        try {
          mediaPaths = JSON.parse(config.mediaFilePaths || '[]')
        } catch {
          sendLog('Error parsing media files array. No media files will be uploaded.')
        }

        // Loop through each group
        for (let i = 0; i < selectedGroupLinks.length; i++) {
          if (this.stopRequested) throw new Error('Stop requested')
          const link = selectedGroupLinks[i]
          if (!link) continue

          sendLog(`[${i + 1}/${selectedGroupLinks.length}] Navigating to: ${link}`)
          try {
            await page.goto(link, { waitUntil: 'networkidle2' })
            if (this.stopRequested) throw new Error('Stop requested')
            await new Promise((resolve) => setTimeout(resolve, 3000))
            if (this.stopRequested) throw new Error('Stop requested')

            // Check if Buy/Sell group
            const isSellSomething = await page.evaluate(() => {
              const sellButton = document.querySelector(
                'div[aria-label="Sell Something"][role="button"]'
              )
              return !!sellButton
            })

            if (isSellSomething) {
              sendLog(`Skipping "Sell Something" group: ${link}`)
              continue
            }

            // Click Write something...
            sendLog('Looking for "Write something..." button...')
            const writeButtonXPath =
              '//div[@role="button" and .//span[contains(text(), "Write something...")]]'
            const writeButton = await page.waitForSelector(`xpath/${writeButtonXPath}`, {
              timeout: 5000
            })

            if (this.stopRequested) throw new Error('Stop requested')

            if (writeButton) {
              await writeButton.click()
              await new Promise((resolve) => setTimeout(resolve, 2000))
              if (this.stopRequested) throw new Error('Stop requested')

              sendLog('Typing message...')
              await page.keyboard.type(config.postContent, { delay: 100 })
              if (this.stopRequested) throw new Error('Stop requested')

              // Handle Media uploads
              if (mediaPaths.length > 0) {
                sendLog(`Uploading ${mediaPaths.length} media file(s)...`)

                let fileInputHandle = await page.evaluateHandle(() => {
                  // 1. Try specific class name first
                  let input = Array.from(
                    document.querySelectorAll('input[type="file"].x1s85apg')
                  ).find((i) => !i.closest('[aria-hidden="true"]'))
                  if (!input) {
                    // 2. Try generic image/video file inputs that are not aria-hidden
                    input = Array.from(document.querySelectorAll('input[type="file"]')).find(
                      (i) => {
                        const accept = i.getAttribute('accept') || ''
                        return (
                          !i.closest('[aria-hidden="true"]') &&
                          (accept.includes('image') || accept.includes('video'))
                        )
                      }
                    )
                  }
                  if (!input) {
                    // 3. Try any visible file input
                    input = Array.from(document.querySelectorAll('input[type="file"]')).find(
                      (i) => !i.closest('[aria-hidden="true"]')
                    )
                  }
                  return input
                })
                let fileInput =
                  fileInputHandle.asElement() as ElementHandle<HTMLInputElement> | null

                if (!fileInput) {
                  sendLog(
                    'File input not found immediately. Attempting to click "Photo/video" button to activate the uploader...'
                  )
                  const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('div[role="button"]'))
                    const photoBtn = buttons.find((btn) => {
                      const text = btn.textContent || ''
                      const label = btn.getAttribute('aria-label') || ''
                      return (
                        text.toLowerCase().includes('photo/video') ||
                        label.toLowerCase().includes('photo/video')
                      )
                    })
                    if (photoBtn) {
                      ;(photoBtn as HTMLElement).click()
                      return true
                    }
                    return false
                  })

                  if (clicked) {
                    sendLog(
                      'Clicked "Photo/video" button, waiting for the uploader component to mount...'
                    )
                    await new Promise((resolve) => setTimeout(resolve, 2500))

                    fileInputHandle = await page.evaluateHandle(() => {
                      let input = Array.from(
                        document.querySelectorAll('input[type="file"].x1s85apg')
                      ).find((i) => !i.closest('[aria-hidden="true"]'))
                      if (!input) {
                        input = Array.from(document.querySelectorAll('input[type="file"]')).find(
                          (i) => {
                            const accept = i.getAttribute('accept') || ''
                            return (
                              !i.closest('[aria-hidden="true"]') &&
                              (accept.includes('image') || accept.includes('video'))
                            )
                          }
                        )
                      }
                      if (!input) {
                        input = Array.from(document.querySelectorAll('input[type="file"]')).find(
                          (i) => !i.closest('[aria-hidden="true"]')
                        )
                      }
                      return input
                    })
                    fileInput =
                      fileInputHandle.asElement() as ElementHandle<HTMLInputElement> | null
                  }
                }

                if (fileInput) {
                  await fileInput.uploadFile(...mediaPaths)
                  await page.evaluate((el) => {
                    if (el) {
                      el.dispatchEvent(new Event('change', { bubbles: true }))
                      el.dispatchEvent(new Event('input', { bubbles: true }))
                    }
                  }, fileInput)
                  sendLog('Media uploaded, waiting for thumbnails to process...')
                  await new Promise((resolve) => setTimeout(resolve, 6000))
                } else {
                  sendLog('Could not locate file input element for uploading.')
                }
              }

              if (this.stopRequested) throw new Error('Stop requested')

              // Click Post
              sendLog('Posting...')
              const postButton = await page.waitForSelector(
                'div[aria-label="Post"][role="button"]',
                {
                  timeout: 10000
                }
              )

              if (this.stopRequested) throw new Error('Stop requested')

              if (postButton) {
                await postButton.click()
                sendLog(`Post submitted successfully to group: ${link}`)
                await new Promise((resolve) => setTimeout(resolve, 8000))
              } else {
                sendLog('Post button not found.')
              }
            } else {
              sendLog('Could not locate "Write something..." button.')
            }
          } catch (err: unknown) {
            const error = err as Error
            if (
              this.stopRequested ||
              error.message.includes('Stop requested') ||
              error.message.includes('Target closed') ||
              error.message.includes('Navigation failed')
            ) {
              throw new Error('Stop requested')
            }
            sendLog(`Error writing to group: ${error.message}`)
          }
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

      await page.goto('https://web.facebook.com', {
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
