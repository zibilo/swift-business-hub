
import ExcelJS from 'exceljs';

self.onmessage = async (e: MessageEvent) => {
  const { arrayBuffer } = e.data;

  try {
    const workbook = new ExcelJS.Workbook();
    // Use streaming if possible, but reading from buffer requires load
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    const data: any[] = [];

    if (worksheet) {
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip header
          const values = row.values;
          data.push(values);

          // Send progress every 100 rows
          if (rowNumber % 100 === 0) {
            self.postMessage({ type: 'progress', progress: rowNumber });
          }
        }
      });
    }

    self.postMessage({ type: 'complete', data });
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
