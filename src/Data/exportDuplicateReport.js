import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const exportDuplicateReport = (duplicateGroups) => {
  if (!duplicateGroups || duplicateGroups.length === 0) {
    alert("No data to export");
    return;
  }

  const rows = [];

  duplicateGroups.forEach(group => {
    const originalName = group.originalFileName;
    const originalPath = group.originalFilePath;

    group.duplicateFiles.forEach(dup => {
      rows.push({
        Original_File_Name: originalName,
        Original_File_Path: originalPath,
        Duplicate_File_Name: dup.duplicateFileName,
        Duplicate_File_Path: dup.duplicateFilePath,
        Version: dup.version,
        Created_On: new Date(dup.createdOn).toLocaleString()
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Duplicate Report");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const data = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(data, "duplicate_documents_report.xlsx");
};

export default exportDuplicateReport;