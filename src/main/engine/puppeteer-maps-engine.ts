import { executablePath, Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { MapSearchResult, SearchOptions } from '@shared/types'
import type { MapsEngine } from './maps-engine.js'
import { BrowserManager } from '../browser-manager'

export class PuppeteerMapsEngine implements MapsEngine {
  private browser?: Browser
  private page?: Page

  private currentMousePos = { x: 400, y: 300 }

  constructor() {
    puppeteer.use(StealthPlugin())
  }

  async init(): Promise<void> {
    const customExePath = await BrowserManager.getExecutablePath()

    this.browser = await puppeteer.launch({
      headless: false,
      executablePath: customExePath || executablePath(),
      args: ['--start-maximized', '--lang=en-US']
    })
    this.page = await this.browser.newPage()
    await this.page.evaluateOnNewDocument(() => {
      // @ts-ignore: Custom property for internal tracking
      window.__name = (fn: (...args: unknown[]) => unknown) => fn
    })
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    })

    const viewport = await this.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }))
    this.currentMousePos = {
      x: Math.floor(viewport.width / 2),
      y: Math.floor(viewport.height / 2)
    }
  }

  async close(): Promise<void> {
    await this.getPage().close()
    this.page = undefined

    if (this.browser) {
      await this.browser.close()
      this.browser = undefined
    }
  }

  async search(query: string, options?: SearchOptions): Promise<MapSearchResult[]> {
    const page = this.getPage()
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+')
    const url = `https://www.google.com/maps/search/${encodedQuery}?hl=en`

    await page.goto(url, { waitUntil: 'networkidle2' })
    await this.wait(2000, 3000)

    let scrollCount = 0
    const maxScrolls = options?.maxScrolls ?? 5
    let lastHeight = await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]')
      return feed ? feed.scrollHeight : 0
    })

    while (scrollCount < maxScrolls) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]')
        if (feed) feed.scrollBy(0, feed.scrollHeight)
      })

      await this.wait(2000, 3000)

      const newHeight = await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]')
        return feed ? feed.scrollHeight : 0
      })

      if (newHeight === lastHeight || newHeight === 0) break
      lastHeight = newHeight
      scrollCount++
    }

    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="article"]'))
      return items.map((item) => {
        const titleEl = item.querySelector('.qBF1Pd')
        const ratingEl = item.querySelector('.MW4etd')
        const linkEl = item.querySelector('a.hfpxzc') as HTMLAnchorElement | null

        const infoBlocks = Array.from(item.querySelectorAll('.W4Efsd'))
        let type = ''
        let address = ''

        const firstBlock = infoBlocks[0]
        if (firstBlock) {
          const textSegments = Array.from(firstBlock.querySelectorAll('span'))
            .map((s) => s.textContent?.trim() || '')
            .filter((t) => t && t !== '·')

          if (textSegments.length > 0) {
            type = textSegments[0] || ''
            if (textSegments.length > 1) {
              address = textSegments[textSegments.length - 1] || ''
            }
          }
        }

        const rating = ratingEl ? parseFloat(ratingEl.textContent || '0') : undefined

        let reviews = 0
        const reviewContainer = item.querySelector('.ZkP5Je')
        if (reviewContainer) {
          const ariaLabel = reviewContainer.getAttribute('aria-label')
          if (ariaLabel) {
            const match = ariaLabel.match(/(\d+) reviews/)
            if (match && match[1]) reviews = parseInt(match[1])
          }
        }

        return {
          title: titleEl?.textContent?.trim() || 'Unknown',
          address: address || 'Unknown',
          rating: isNaN(rating as number) ? undefined : rating,
          reviews: reviews || undefined,
          type: type || undefined,
          url: linkEl?.href
        }
      })
    })

    const processedResults: MapSearchResult[] = results.map((res) => {
      const { url, ...data } = res
      let gps_coordinates: MapSearchResult['gps_coordinates'] = undefined
      let place_id: string | undefined = undefined

      if (url) {
        const coordsMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
        if (coordsMatch && coordsMatch[1] && coordsMatch[2]) {
          gps_coordinates = {
            latitude: parseFloat(coordsMatch[1]),
            longitude: parseFloat(coordsMatch[2])
          }
        }

        const placeIdMatch = url.match(/!1s([^!&?]+)/) || url.match(/!19s([^!&?]+)/)
        if (placeIdMatch && placeIdMatch[1]) {
          place_id = placeIdMatch[1]
        }
      }

      return {
        ...data,
        url,
        gps_coordinates,
        place_id
      }
    })

    const finalResults: MapSearchResult[] = []
    for (const res of processedResults) {
      if (res.url) {
        try {
          await page.goto(res.url, { waitUntil: 'networkidle2' })

          try {
            await page.waitForSelector('h1.DUwDvf, .Io6YTe', { timeout: 5000 })
          } catch {
            // Ignore timeout if selector is not found
          }

          const detailedData = await page.evaluate(() => {
            const getField = (itemId: string, ariaPrefix: string): string | undefined => {
              const el = document.querySelector(
                `[data-item-id^="${itemId}"], [aria-label^="${ariaPrefix}"]`
              )
              if (!el) return undefined

              const ioText = el.querySelector('.Io6YTe')?.textContent?.trim()
              if (ioText) return ioText

              const ariaLabel = el.getAttribute('aria-label')
              if (ariaLabel && ariaLabel.startsWith(ariaPrefix)) {
                return ariaLabel.replace(ariaPrefix, '').trim()
              }

              return el.textContent?.trim()
            }

            const phone = getField('phone:tel', 'Phone: ')
            const address = getField('address', 'Address: ')
            const plus_code = getField('oloc', 'Plus code: ')

            const websiteEl = document.querySelector(
              'a[data-item-id="authority"]'
            ) as HTMLAnchorElement | null
            const website = websiteEl?.href || getField('authority', 'Website: ')

            const priceEl = document.querySelector('.MNVeJb')
            let price: string | undefined = undefined
            if (priceEl) {
              const priceText = priceEl.textContent?.trim() || ''
              const priceMatch = priceText.match(/((?:Rp|[$£€])[\s\u00A0]*[\d. \-–—,]+)/)
              price = priceMatch && priceMatch[1] ? priceMatch[1].trim() : undefined
            }

            const openingHours: string[] = []
            const hoursTable = document.querySelector('table.eK4R0e')
            if (hoursTable) {
              const rows = Array.from(hoursTable.querySelectorAll('tr'))
              rows.forEach((row) => {
                const day = row.querySelector('.ylH6lf')?.textContent?.trim()
                const hours = row.querySelector('.mxowUb')?.textContent?.trim()
                if (day && hours) openingHours.push(`${day}: ${hours}`)
              })
            }

            return {
              phone,
              website,
              price,
              address,
              plus_code,
              opening_hours: openingHours.length > 0 ? openingHours : undefined
            }
          })

          finalResults.push({
            ...res,
            ...detailedData
          } as MapSearchResult)
        } catch (error) {
          console.error(`Error scraping detail for ${res.title}:`, error)
          finalResults.push(res as MapSearchResult)
        }
      } else {
        finalResults.push(res as MapSearchResult)
      }
    }

    return finalResults
  }

  private async wait(start: number, end: number): Promise<void> {
    const page = this.getPage()
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }))

    const duration = Math.floor(Math.random() * (end - start) + start)
    const startTime = Date.now()

    while (Date.now() - startTime < duration) {
      const targetX = Math.floor(Math.random() * viewport.width)
      const targetY = Math.floor(Math.random() * viewport.height)

      await this.bezierMove(this.currentMousePos.x, this.currentMousePos.y, targetX, targetY)

      this.currentMousePos = { x: targetX, y: targetY }

      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 500) + 200))
    }
  }

  private async bezierMove(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const page = this.getPage()
    const cp1x = fromX + (Math.random() - 0.5) * 200
    const cp1y = fromY + (Math.random() - 0.5) * 200
    const cp2x = toX + (Math.random() - 0.5) * 200
    const cp2y = toY + (Math.random() - 0.5) * 200

    const steps = Math.floor(Math.random() * 15) + 15
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x =
        Math.pow(1 - t, 3) * fromX +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * toX
      const y =
        Math.pow(1 - t, 3) * fromY +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * toY

      await page.mouse.move(x, y)
      await new Promise((r) => setTimeout(r, Math.random() * 30 + 10))
    }
  }

  private getPage(): Page {
    if (!this.page) {
      throw new Error('Engine not initialized. Call init() first.')
    }
    return this.page
  }
}
