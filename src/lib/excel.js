import * as XLSX from 'xlsx'

export const EXCEL_HEADERS = ['#', 'Name', 'Japanese']

export const readWorkbookFromArrayBuffer = (buffer) => XLSX.read(buffer)
