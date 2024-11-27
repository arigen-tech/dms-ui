import React, {useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Header from '../Components/Header';
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

const dummyData = [
    { sr: 1, fileNo: 'FMID1708534506152', creationDate: '21/02/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 2, fileNo: 'FMID1716483454198', creationDate: '23/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 3, fileNo: 'FMID1716831404178', creationDate: '27/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 4, fileNo: 'FMID1716832143812', creationDate: '27/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 5, fileNo: 'FMID1716931143269', creationDate: '29/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 6, fileNo: 'FMID1708534506827', creationDate: '21/02/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 7, fileNo: 'FMID1716483451823', creationDate: '23/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 8, fileNo: 'FMID1716831472133', creationDate: '27/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 9, fileNo: 'FMID1716832149218', creationDate: '27/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
    { sr: 10, fileNo: 'FMID1716931143218', creationDate: '29/05/2024', title: 'Temp', subject: 'Document Registration', action: 'View' },
  ];
  
  const Stats = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
  
    const filteredData = dummyData.filter(item =>
      Object.values(item).some(val => 
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  
    const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
    return (
        <div className="p-1">
        <h1 className="text-xl mb-4 font-semibold">INBOX</h1>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="mb-4 bg-slate-100 p-4 rounded-lg">
            <div className="flex justify-between">
              <div className="flex items-center bg-blue-500 rounded-lg">
                <label htmlFor="recordsPerPage" className="mr-2 ml-2 text-white text-sm">Show:</label>
                <select
                  id="recordsPerPage"
                  className="border rounded-r-lg p-1.5 outline-none"
                  value={recordsPerPage}
                  onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                >
                  {[5, 10, 15, 20].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search..."
                  className="border rounded-l-md p-1 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
              </div>
            </div>
          </div>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">FILE NO.</th>
                <th className="border p-2 text-left">CREATION DATE</th>
                <th className="border p-2 text-left">TITLE</th>
                <th className="border p-2 text-left">SUBJECT</th>
                <th className="border p-2 text-left">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((item) => (
                <tr key={item.sr}>
                  <td className="border p-2">{item.sr}</td>
                  <td className="border p-2">{item.fileNo}</td>
                  <td className="border p-2">{item.creationDate}</td>
                  <td className="border p-2">{item.title}</td>
                  <td className="border p-2">{item.subject}</td>
                  <td className="border p-2 px-6">
                    <button>
                      <EyeIcon className="h-6 w-6 bg-yellow-400 rounded-xl p-1 text-white">
                        {item.action}
                      </EyeIcon>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      
          <div className="flex justify-self-start items-center mt-4">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-slate-200 px-3 py-1 rounded mr-3"
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              Previous
            </button>
            <span className="text-blue-500 font-semibold">Page {currentPage}</span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={indexOfLastRecord >= filteredData.length}
              className="bg-slate-200 px-3 py-1 rounded ml-3"
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

function Inbox() {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className='flex flex-row bg-neutral-100 h-screen w-screen overflow-hidden'>
      {sidebarOpen && <Sidebar />}
      <div className='flex flex-col flex-1'>
        <Header toggleSidebar={toggleSidebar} />
        <div className='flex-1 p-4 min-h-0 overflow-auto'>
            <Stats />
        </div>
      </div>
    </div>
    )
}

export default Inbox