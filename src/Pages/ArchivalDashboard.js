import React, { useState, useMemo } from 'react';
import { Search, Calendar, Clock, Archive, FileText, CheckCircle , Building, Users, Filter, RefreshCw } from 'lucide-react';
import Layout from "../Components/Layout";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ArchiveBoxXMarkIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/solid';
import ArchiveBoxCheachMarkIcon from '../Assets/ArchiveBoxCheachMarkIcon.png';


const generateSampleData = () => {

    const branches = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];
    const departments = ['HR', 'Finance', 'IT', 'Operations', 'Legal', 'Marketing'];
    const statuses = ['Scheduled', 'Archived', 'Failed'];

    return Array.from({ length: 50 }, (_, i) => ({
        id: `ARC-${String(i + 1).padStart(4, '0')}`,
        title: `Document Set ${i + 1}`,
        branch: branches[Math.floor(Math.random() * branches.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        scheduledDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        archivedDate: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        priority: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low',
        size: `${(Math.random() * 500 + 10).toFixed(1)} MB`,
        documentsCount: Math.floor(Math.random() * 1000) + 10
    }));
};

const ArchivalDashboard = () => {
    const [data] = useState(generateSampleData());
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [sortBy, setSortBy] = useState('fifo');

    // Get unique values for filters
    const branches = [...new Set(data.map(item => item.branch))];
    const departments = [...new Set(data.map(item => item.department))];
    const statuses = [...new Set(data.map(item => item.status))];



    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
        let filtered = data.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.department.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesBranch = selectedBranch === 'All' || item.branch === selectedBranch;
            const matchesDepartment = selectedDepartment === 'All' || item.department === selectedDepartment;
            const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;

            return matchesSearch && matchesBranch && matchesDepartment && matchesStatus;
        });

        // FIFO Queue Management: Scheduled items first, then by date
        return filtered.sort((a, b) => {
            if (sortBy === 'fifo') {
                if (a.status === 'Scheduled' && b.status !== 'Scheduled') return -1;
                if (b.status === 'Scheduled' && a.status !== 'Scheduled') return 1;

                // For scheduled items, sort by scheduled date (earliest first)
                if (a.status === 'Scheduled' && b.status === 'Scheduled') {
                    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
                }

                // For archived items, sort by archived date (most recent first)
                if (a.archivedDate && b.archivedDate) {
                    return new Date(b.archivedDate) - new Date(a.archivedDate);
                }

                return 0;
            }

            // Other sorting options can be added here
            return 0;
        });
    }, [data, searchTerm, selectedBranch, selectedDepartment, selectedStatus, sortBy]);

    const totalItems = filteredAndSortedData?.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginatedFiles = filteredAndSortedData?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getPageNumbers = () => {
        const maxPageNumbers = 5;
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    // Statistics
    const stats = useMemo(() => {
        const total = filteredAndSortedData.length;
        const scheduled = filteredAndSortedData.filter(item => item.status === 'Scheduled').length;
        const inProgress = filteredAndSortedData.filter(item => item.status === 'In Progress').length;
        const archived = filteredAndSortedData.filter(item => item.status === 'Archived').length;
        const failed = filteredAndSortedData.filter(item => item.status === 'Failed').length;

        return { total, scheduled, inProgress, archived, failed };
    }, [filteredAndSortedData]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Scheduled': return 'bg-yellow-100 text-yellow-400';
            case 'Archived': return 'bg-green-100 text-green-800';
            case 'Failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Layout>
            <div className="bg-slate-100 p-3 -mt-6">

                <div className="max-w-7xl mx-auto">
                    <h1 className="text-xl font-bold text-gray-900 mb-1">Archival Dashboard</h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Records</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <Archive className="h-8 w-8 text-gray-400" />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Scheduled</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-400" />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Archived</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.archived}</p>
                                </div>
                                <img src={ArchiveBoxCheachMarkIcon} className='h-9 w-9' alt="icon" />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Failed</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                                </div>
                                <ArchiveBoxXMarkIcon className="h-8 w-8 text-red-400" />
                            </div>
                        </div>
                    </div>


                    <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Search Input */}
                            <div className="flex-1 min-w-64">
                                <div className="relative">
                                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search by ID, title, branch, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Branch Filter */}
                            <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="All">All Branches</option>
                                    {branches.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Department Filter */}
                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="All">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="All">All Status</option>
                                    {statuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>


                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            S.N.
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Archive Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Office Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>

                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Scheduled Date
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Archived Date
                                        </th>

                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Documents
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedFiles?.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.title}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.branch}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.department}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.scheduledDate.toLocaleDateString()} {item.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.archivedDate ? (
                                                    <>
                                                        {item.archivedDate.toLocaleDateString()} {item.archivedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.documentsCount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="flex items-center mt-4">
                            {/* Previous Button */}
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                                Previous
                            </button>

                            {/* Page Number Buttons */}
                            {getPageNumbers()?.map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            {/* Page Count Info */}
                            <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

                            {/* Next Button */}
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                Next
                                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                            </button>
                            <div className="ml-4">
                                <span className="text-sm text-gray-700">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                    {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                                    {totalItems} entries
                                </span>
                            </div>
                        </div>

                        {filteredAndSortedData.length === 0 && (
                            <div className="text-center py-12">
                                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No archival records found</h3>
                                <p className="text-gray-500">Try adjusting your search criteria or filters</p>
                            </div>
                        )}
                    </div>


                </div>
            </div>
        </Layout>
    );
};

export default ArchivalDashboard;