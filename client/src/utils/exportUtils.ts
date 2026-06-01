import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ColumnDefinition {
  header: string
  dataKey: string
  format?: 'currency' | 'date' | 'string' | 'number'
  align?: 'left' | 'center' | 'right'
}

export interface ExportPDFOptions {
  title: string
  subtitle?: string
  filename: string
  columns: ColumnDefinition[]
  data: any[]
  orientation?: 'portrait' | 'landscape'
}

export interface ExportExcelOptions {
  filename: string
  sheetName: string
  columns: ColumnDefinition[]
  data: any[]
}

const formatCurrency = (val: any) => {
  if (val == null) return '—'
  const num = Number(val)
  if (isNaN(num)) return String(val)
  return '₹' + num.toLocaleString('en-IN')
}

const formatDate = (val: any) => {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN')
  } catch (e) {
    return String(val)
  }
}

const formatValue = (val: any, format?: string) => {
  if (val == null) return '—'
  if (format === 'currency') return formatCurrency(val)
  if (format === 'date') return formatDate(val)
  return String(val)
}

export const exportToPDF = (options: ExportPDFOptions) => {
  const { title, subtitle, filename, columns, data, orientation = 'portrait' } = options
  const doc = new jsPDF({ orientation })
  
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  // Header Section
  doc.setFontSize(18)
  doc.setTextColor(31, 41, 55) // gray-800
  doc.text(title, 14, 16)
  
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128) // gray-500
  
  let yPos = 23
  if (subtitle) {
    doc.text(subtitle, 14, yPos)
    yPos += 6
  }
  doc.text(`Generated on: ${today} | Total records: ${data.length}`, 14, yPos)

  const head = [columns.map(c => c.header)]
  
  const body = data.map(row => 
    columns.map(c => formatValue(row[c.dataKey], c.format))
  )

  const columnStyles: { [key: number]: any } = {}
  columns.forEach((c, index) => {
    if (c.align) {
      columnStyles[index] = { halign: c.align }
    } else if (c.format === 'currency' || c.format === 'number') {
      columnStyles[index] = { halign: 'right' }
    }
  })

  autoTable(doc, {
    startY: yPos + 6,
    head,
    body,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 4,
      lineColor: [229, 231, 235], // gray-200
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [79, 70, 229], // brand-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { 
      fillColor: [249, 250, 251] // gray-50
    },
    columnStyles,
    didDrawPage: (data) => {
      // Footer
      const str = 'Page ' + (doc.internal as any).getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175) // gray-400
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
      doc.text(str, data.settings.margin.left, pageHeight - 10)
    }
  })

  doc.save(`${filename}.pdf`)
}

export const exportToExcel = (options: ExportExcelOptions) => {
  const { filename, sheetName, columns, data } = options
  
  const formattedData = data.map(row => {
    const formattedRow: any = {}
    columns.forEach(c => {
      // Don't format numbers as currency string for Excel to allow calculations,
      // but we will provide the raw value. You can add actual Excel formats if needed.
      let val = row[c.dataKey]
      if (c.format === 'currency' && val != null) {
         val = Number(val)
      } else if (val == null) {
         val = '—'
      }
      formattedRow[c.header] = val
    })
    return formattedRow
  })

  const ws = XLSX.utils.json_to_sheet(formattedData)
  
  // Basic auto-width (very rudimentary)
  const cols = columns.map(c => ({ wch: Math.max(12, c.header.length + 2) }))
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
