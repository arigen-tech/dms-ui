import React, { useState } from 'react';

function FormData() {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [subject, setSubject] = useState('');
  const [validTo, setValidTo] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [files, setFiles] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      title,
      department,
      branch,
      fileNo,
      subject,
      validTo,
      category,
      tags,
      documentType,
      files,
    });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  return (
    <div className="w-full h-screen flex items-center">
      <div className="w-full h-full bg-slate-100 flex flex-col mb-20 justify-center items-center">
        <div className="w-full flex flex-col max-w-[500px]">
          <div className="w-full flex flex-col mb-2">
            <h3 className="text-3xl font-semibold mb-2">Add Document</h3>
            <p className="text-base mb-2">Please enter the document details.</p>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="flex flex-col col-span-2">
              <label htmlFor="documentType" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
              >
                <option value="">Select Type</option>
                <option value="Report">Report</option>
                <option value="Invoice">Invoice</option>
                <option value="Memo">Memo</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col col-span-2">
              <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Category
              </label>
              <input
                type="text"
                placeholder="Category"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Title
              </label>
              <input
                type="text"
                placeholder="Document Title"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="department" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Department
              </label>
              <input
                type="text"
                placeholder="Department"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="branch" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Branch
              </label>
              <input
                type="text"
                placeholder="Branch"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="fileNo" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                File No.
              </label>
              <input
                type="text"
                placeholder="File No."
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="subject" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Subject
              </label>
              <input
                type="text"
                placeholder="Subject"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-1">
              <label htmlFor="validTo" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Valid To
              </label>
              <input
                type="date"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-2">
              <label htmlFor="tags" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Tags
              </label>
              <input
                type="text"
                placeholder="Tags (comma separated)"
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div className="flex flex-col col-span-2">
              <label htmlFor="files" className="block text-sm font-medium leading-6 text-gray-900 mt-0">
                Upload Files (.pdf only)
              </label>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="w-full text-black py-2 my-0 shadow-sm ring-1 ring-inset ring-gray-300 bg-white border-0 border-gray-400 outline-none focus:outline-none px-4 rounded-md"
              />
            </div>
            <div className="flex flex-col col-span-2">
              <button
                type="submit"
                className="w-full text-white my-2 font-semibold bg-slate-900 rounded-md p-3 text-center flex items-center justify-center cursor-pointer hover:bg-slate-800"
              >
                Add Document
              </button>
            </div>
          </form>
        </div>
        <div className="w-full flex items-center justify-center">
          <p className="text-sm font-normal text-[#060606] opacity-80">© DMS 2024</p>
        </div>
      </div>
    </div>
  );
}

export default FormData;
