import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

export function convertObjectToDataOptions(obj: Record<string, string | number>, swap: boolean = false) {
  return Object.keys(obj).map((key) => ({
    id: swap ? obj[key] : key,
    text: swap ? key : obj[key],
  }));
}

export function convertIndexArrayToDataOptions(arr: string[], options: { keyValue?: 'same' | 'default' }) {
  const temp: Record<string | number, string> = {};
  arr.forEach((value, key) => {
    const keyObj = options.keyValue === 'default' ? key : value;
    temp[keyObj] = value;
  });
  return temp;
}

export function convertArrayObjToDataOptions<TArr = string>(
  arr: TArr[],
  options: { key: keyof TArr; value: TArr[keyof TArr]; extendOption?: Record<string, TArr[keyof TArr]> }
): Record<string, TArr[keyof TArr]> {
  const temp: { [key in keyof TArr]: TArr[keyof TArr] } = {} as { [key in keyof TArr]: TArr[keyof TArr] };
  arr.forEach((item) => {
    Object.assign(temp, { [item[options.key] as keyof TArr]: item[options.value as keyof TArr] });
  });
  return options.extendOption ? { ...temp, ...options.extendOption } : temp;
}

export function debounce<T extends unknown[], U>(callback: (...args: T) => PromiseLike<U> | U, wait: number = 500) {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: T): Promise<U> => {
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(() => resolve(callback(...args)), wait);
    });
  };
}

export function formatRupiah(number: number, hideRp: boolean = false) {
  const parsed = number.toLocaleString('id-ID').replaceAll('.', '.');
  if (hideRp) return parsed;
  return `Rp. ${parsed}`;
}

export function exportDataToExcel<TData>(
  dataExport: TData[],
  title: string,
  sheetName: string,
  columnWidths?: IExcelColumnWidth[],
  firstRowTitle?: string
) {
  const workbook = XLSX.utils.book_new();
  const worksheetData: unknown[][] = [];

  // set title to first row (Col A1) if not undefined
  if (firstRowTitle !== undefined) {
    worksheetData.push([firstRowTitle]);
  }

  // add column headers
  worksheetData.push(Object.keys(dataExport[0] as keyof TData));

  // add the data
  worksheetData.push(...dataExport.map((row) => Object.values(row as object)));

  // convert array of arrays into a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // set the column width (conditional)
  if (columnWidths && columnWidths.length > 0) {
    worksheet['cols!'] = columnWidths;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${title} ${dayjs(new Date()).format('DDMMYYYYHHmmss')}.xlsx`);
}

export function generateColumnWidths<TData>(data: TData[]) {
  if (!data || data.length === 0) return [];

  const keys = Object.keys(data[0] as keyof TData);
  return keys.map((key) => ({
    wch: Math.max(...data.map((item: TData) => (item[key as keyof TData] ? String(item[key as keyof TData]).length + 2 : 10)), key.length + 2),
  }));
}

export function readUploadFileExcel(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (!file) {
      reject('file not found');
      return;
    }
    reader.onload = (e) => {
      if (!e.target?.result) {
        reject();
        return;
      }
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workBook = XLSX.read(data, { type: 'array' });

      const workSheetName = workBook.SheetNames[0];

      const workSheet = workBook.Sheets[workSheetName];
      const dataParse = XLSX.utils.sheet_to_json(workSheet);
      resolve(dataParse);
    };
    reader.readAsArrayBuffer(file);
  });
}

export function isValidUrl(url: string) {
  try {
    return new URL(url);
  } catch (_error) {
    console.error('Error validating URL', _error);
    return false;
  }
}

export const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    return successful;
  } catch (err) {
    console.error('Fallback: Copy command failed', err);
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};
