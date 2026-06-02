import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'

export interface DetailField {
  label: string
  value: any
}

/**
 * Generates a styled detail report PDF for a single record using jsPDF & autoTable.
 */
export const generateDetailPDF = (
  title: string,
  subtitle: string,
  fields: DetailField[]
): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Header Banner
  doc.setFillColor(79, 70, 229) // Indigo-600
  doc.rect(0, 0, 210, 38, 'F')

  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 16)

  doc.setFontSize(9)
  doc.setTextColor(224, 231, 255) // Indigo-100
  doc.setFont('helvetica', 'normal')
  doc.text(`${subtitle} | Generated: ${today}`, 14, 25)

  // Add decorative accent line
  doc.setFillColor(244, 63, 94) // Rose-500
  doc.rect(0, 38, 210, 2, 'F')

  // Prepare fields into a 2-column key-value list
  const body: any[] = []
  for (let i = 0; i < fields.length; i += 2) {
    const f1 = fields[i]
    const f2 = fields[i + 1] || { label: '', value: '' }
    body.push([f1.label, f1.value == null || f1.value === '' ? '—' : String(f1.value), f2.label, f2.value == null || f2.value === '' ? '—' : String(f2.value)])
  }

  autoTable(doc, {
    startY: 48,
    body,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [229, 231, 235], // Gray-200
      lineWidth: 0.1,
      textColor: [55, 65, 81], // Gray-700
      valign: 'middle'
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [31, 41, 55], cellWidth: 42 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [31, 41, 55], cellWidth: 42 },
      3: { cellWidth: 55 }
    },
    margin: { left: 14, right: 14 }
  })

  // Footer page number
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175) // Gray-400
    doc.text(
      `Page ${i} of ${pageCount} | Auto Nidhi Management Portal`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  return doc
}

/**
 * Generates individual detailed PDFs for a list of records, bundles them inside a ZIP,
 * and triggers a download of the ZIP file.
 */
export const exportDetailPDFsAsZip = async (
  zipFilename: string,
  selectedRows: any[],
  getFields: (row: any) => DetailField[],
  getRecordName: (row: any) => string,
  pageTitle: string,
  pageSubtitle: string
) => {
  if (selectedRows.length === 0) return

  const zip = new JSZip()

  selectedRows.forEach((row, index) => {
    const fields = getFields(row)
    const recordName = getRecordName(row)
      .replace(/[/\\?%*:|"<>. ]/g, '_') // sanitize file name characters
      .substring(0, 80) // limit name length

    const doc = generateDetailPDF(
      `${pageTitle} Details`,
      `${pageSubtitle} #${index + 1}`,
      fields
    )

    const blob = doc.output('blob')
    const filename = `${recordName}.pdf`
    zip.file(filename, blob)
  })

  const content = await zip.generateAsync({ type: 'blob' })

  // Trigger download
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = `${zipFilename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
