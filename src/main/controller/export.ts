import { Search } from '@shared/types'
import { getSearchResults } from './search-result'
import xlsx from 'node-xlsx'
import { dialog } from 'electron'
import fs from 'node:fs/promises'

type Exporter = {
  export(search: Search): Promise<void>
}

export class ExcelExporter implements Exporter {
  async export(search: Search): Promise<void> {
    const results = await getSearchResults({ search_id: search.id })

    if (!results || results.length === 0) {
      throw new Error('No results to export')
    }

    const headers = [
      'ID',
      'Title',
      'Address',
      'Rating',
      'Reviews',
      'Phone',
      'Website',
      'Price',
      'Latitude',
      'Longitude',
      'Place ID',
      'Opening Hours',
      'Plus Code',
      'Type',
      'URL',
      'Created At'
    ]

    const rows = results.map((r) => [
      r.id,
      r.title,
      r.address,
      r.rating,
      r.reviews,
      r.phone,
      r.website,
      r.price,
      r.latitude,
      r.longitude,
      r.placeId,
      r.openingHours,
      r.plusCode,
      r.type,
      r.url,
      r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
    ])

    const buffer = xlsx.build([{ name: 'Search Results', data: [headers, ...rows], options: {} }])

    const result = await dialog.showSaveDialog({
      title: 'Export Search Results',
      defaultPath: `${search.title} - Results.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePath) {
      return
    }

    await fs.writeFile(result.filePath, buffer)
  }
}
