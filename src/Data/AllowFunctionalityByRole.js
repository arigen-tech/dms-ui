import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    CheckCircleIcon,
    LockClosedIcon,
    LockOpenIcon,
    PlusCircleIcon,
    MagnifyingGlassIcon,
    ArrowLeftIcon,
    ArrowRightIcon
} from '@heroicons/react/24/solid';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { MAS_ROLES } from '../API/apiConfig';
import { getRequest, postRequest, putRequest } from '../API/apiService';
import Select from 'react-select';

const AllowFunctionalityByRole = () => {
    const { currentLanguage, isTranslationNeeded, translate } = useLanguage();

    // State for data loading
    const [isLoading, setIsLoading] = useState(true);

    // State for translated placeholders
    const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
        search: 'Search...',
        selectRole: 'Select Role',
        selectFunctionalityType: 'Select Functionality Type',
        selectFunctionality: 'Select Functionality'
    });

    // Main data states
    const [roleApiAccessList, setRoleApiAccessList] = useState([]);
    const [endpointTypes, setEndpointTypes] = useState([]);
    const [roles, setRoles] = useState([]);
    const [filteredApiEndpoints, setFilteredApiEndpoints] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        roleId: '',
        endpointTypeId: '',
        apiId: ''
    });

    // UI states
    const [editingId, setEditingId] = useState(null);
    const [popupMessage, setPopupMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [accessToToggle, setAccessToToggle] = useState(null);
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter states
    const [roleFilter, setRoleFilter] = useState(null);
    const [endpointTypeFilter, setEndpointTypeFilter] = useState(null);

    const formSectionRef = useRef(null);
    const token = localStorage.getItem("tokenKey");

    // Helper functions
    const getRoleName = (access) => access.role?.role || 'N/A';
    const getApiName = (access) => access.api ? `${access.api.working}` : 'N/A';
    const getEndpointTypeName = (access) => access.api?.endpointType?.name || 'N/A';

    // Function to translate placeholder text
    const translatePlaceholder = useCallback(async (text) => {
        if (isTranslationNeeded()) {
            try {
                return await translate(text);
            } catch (error) {
                console.error('Error translating placeholder:', error);
                return text;
            }
        }
        return text;
    }, [isTranslationNeeded, translate]);

    // Update placeholders when language changes
    useEffect(() => {
        const updatePlaceholders = async () => {
            if (!isTranslationNeeded()) {
                setTranslatedPlaceholders({
                    search: 'Search...',
                    selectRole: 'Select Role',
                    selectFunctionalityType: 'Select Functionality Type',
                    selectFunctionality: 'Select Functionality'
                });
                return;
            }

            const searchPlaceholder = await translatePlaceholder('Search...');
            const rolePlaceholder = await translatePlaceholder('Select Role');
            const typePlaceholder = await translatePlaceholder('Select Functionality Type');
            const functionalityPlaceholder = await translatePlaceholder('Select Functionality');

            setTranslatedPlaceholders({
                search: searchPlaceholder,
                selectRole: rolePlaceholder,
                selectFunctionalityType: typePlaceholder,
                selectFunctionality: functionalityPlaceholder
            });
        };

        updatePlaceholders();
    }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [rolesRes, endpointTypeRes, accessRes] = await Promise.all([
                    getRequest(`${MAS_ROLES}/findActiveRole`),
                    getRequest(`/api/api-endpoint-types`),
                    getRequest(`/api/role-api-access/getAll`)
                ]);

                setRoles(rolesRes);
                setEndpointTypes(endpointTypeRes);
                setRoleApiAccessList(accessRes);
            } catch (err) {
                console.error(err);
                showPopup('Failed to load data', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Load API endpoints when endpoint type changes
    const handleEndpointTypeChange = async (selected) => {
        const typeId = selected?.value || '';

        setFormData(prev => ({
            ...prev,
            endpointTypeId: typeId,
            apiId: ''
        }));

        if (!typeId) {
            setFilteredApiEndpoints([]);
            return;
        }

        try {
            const res = await getRequest(`/api/by-type/${typeId}`);
            setFilteredApiEndpoints(res);
        } catch (err) {
            console.error(err);
            showPopup('Failed to load functionalities', 'error');
        }
    };

    // Popup handler
    const showPopup = (message, type = 'info') => {
        setPopupMessage({
            message,
            type,
            onClose: () => setPopupMessage(null)
        });
    };

    // Check for duplicate access
    const isDuplicateAccess = (roleId, apiId) => {
        return roleApiAccessList.some(
            access => access.roleId === parseInt(roleId) &&
                access.apiId === parseInt(apiId) &&
                access.id !== editingId
        );
    };

    // Add new access
const handleAddAccess = async () => {
    if (!formData.roleId || !formData.apiId) {
        showPopup('Please select Role and API Endpoint', 'warning');
        return;
    }

    setIsSubmitting(true);
    try {
        const newAccess = {
            roleId: parseInt(formData.roleId),
            apiId: parseInt(formData.apiId)
        };

        const res = await postRequest(
            `/api/role-api-access/create`,
            newAccess
        );

        setRoleApiAccessList([...roleApiAccessList, res]);
        setFormData({ roleId: '', endpointTypeId: '', apiId: '' });
        showPopup('Access added successfully!', 'success');

    } catch (err) {
    console.error(err);

    let message = 'Failed to add access';

    // Handle fetch-style error
    if (err.message.includes('409')) {
        message = 'Functionality already assigned to this role';
    } else if (err.message.includes('400')) {
        message = 'Invalid request';
    } else if (err.message.includes('403')) {
        message = 'You are not authorized';
    } else if (err.message.includes('500')) {
        message = 'Server error. Please try again later';
    }

    showPopup(message, 'error');
}
 finally {
        setIsSubmitting(false);
    }
};



    // Save edit
    const handleSaveEdit = async () => {
        if (!formData.roleId || !formData.apiId) {
            showPopup('Please select Role and API Endpoint', 'warning');
            return;
        }
        if (isDuplicateAccess(formData.roleId, formData.apiId)) {
            showPopup('This Role already has access to this API', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const updatedAccess = {
                ...roleApiAccessList.find(a => a.id === editingId),
                roleId: parseInt(formData.roleId),
                apiId: parseInt(formData.apiId)
            };
            const res = await putRequest(`/api/role-api-access/${editingId}`, updatedAccess);
            setRoleApiAccessList(roleApiAccessList.map(a => a.id === editingId ? res : a));
            setEditingId(null);
            setFormData({ roleId: '', endpointTypeId: '', apiId: '' });
            showPopup('Access updated successfully!', 'success');
        } catch (err) {
            console.error(err);
            showPopup('Failed to update access', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle access status
    const handleToggleAccess = (access) => {
        setAccessToToggle(access);
        setModalVisible(true);
    };

    // Confirm toggle access
    const confirmToggleAccess = async () => {
        setIsConfirmDisabled(true);
        if (!accessToToggle) return;
        try {
            const updatedStatus = !accessToToggle.status;
            const res = await putRequest(`/api/role-api-access/${accessToToggle.id}/status?status=${updatedStatus}`, {});
            setRoleApiAccessList(prev => prev.map(a => a.id === accessToToggle.id ? res : a));
            setModalVisible(false);
            setAccessToToggle(null);
            showPopup('Status changed successfully!', 'success');
        } catch (err) {
            console.error(err);
            showPopup('Failed to change status', 'error');
        } finally {
            setIsConfirmDisabled(false);
        }
    };

    // Filter and pagination logic
    const filteredList = roleApiAccessList.filter(a => {
        if (roleFilter && a.role?.id !== roleFilter) return false;
        if (endpointTypeFilter && a.api?.endpointType?.id !== endpointTypeFilter) return false;

        const roleName = a.role?.role?.toLowerCase() || '';
        const apiName = a.api ? `${a.api.controller} - ${a.api.working} - ${a.api.endpoint}`.toLowerCase() : '';
        if (searchTerm && !roleName.includes(searchTerm.toLowerCase()) && !apiName.includes(searchTerm.toLowerCase())) return false;

        return true;
    });

    // Sort by status (blocked first, then allowed)
    const sortedList = filteredList.sort((a, b) => b.status - a.status);

    const totalItems = sortedList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedList = sortedList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getPageNumbers = () => {
        const maxPageNumbers = 5;
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    if (isLoading) return <LoadingComponent />;

    return (
        <div className="px-2">
            {/* Page Header */}
            <h1 className="text-2xl mb-1 font-semibold">
                <AutoTranslate>Manage Role & Functionality Access</AutoTranslate>
            </h1>
            <p className="text-sm md:text-base text-gray-600 mb-4">
                <AutoTranslate>This page allows you to control which roles can access which APIs.</AutoTranslate>{' '}
                <strong><AutoTranslate>Status</AutoTranslate> = Access Denied</strong>{' '}
                <AutoTranslate>means the role is blocked from the API.</AutoTranslate>{' '}
                <strong><AutoTranslate>Status</AutoTranslate> = Access Allowed</strong>{' '}
                <AutoTranslate>means the role can access the API.</AutoTranslate>
            </p>

            {/* Popup Messages */}
            {popupMessage && (
                <Popup
                    message={popupMessage.message}
                    type={popupMessage.type}
                    onClose={popupMessage.onClose}
                />
            )}

            <div className="bg-white p-4 rounded-lg shadow-sm">
                {/* Form Section */}
                <div ref={formSectionRef} className="mb-4 bg-slate-100 p-4 rounded-lg">
                    <div className="flex gap-6">
                        <div className="w-4/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Role Select */}
                            <label className="block text-md font-medium text-gray-700">
                                <AutoTranslate>Role</AutoTranslate> <span className="text-red-500">*</span>
                                <Select
                                    options={roles.map(role => ({
                                        value: role.id,
                                        label: `${role.role}${role.level ? ` (Level ${role.level})` : ''}`
                                    }))}
                                    value={roles.find(r => r.id === formData.roleId) ?
                                        { value: formData.roleId, label: `${roles.find(r => r.id === formData.roleId).role}` }
                                        : null
                                    }
                                    onChange={(selected) => setFormData({ ...formData, roleId: selected?.value || '' })}
                                    placeholder={translatedPlaceholders.selectRole}
                                    isClearable
                                    className="mt-1"
                                />
                            </label>

                            {/* API Endpoint Type Select */}
                            <label className="block text-md font-medium text-gray-700">
                                <AutoTranslate>Functionality Type</AutoTranslate> <span className="text-red-500">*</span>
                                <Select
                                    options={endpointTypes.map(type => ({
                                        value: type.id,
                                        label: type.name
                                    }))}
                                    value={
                                        endpointTypes.find(t => t.id === formData.endpointTypeId)
                                            ? {
                                                value: formData.endpointTypeId,
                                                label: endpointTypes.find(t => t.id === formData.endpointTypeId).name
                                            }
                                            : null
                                    }
                                    onChange={handleEndpointTypeChange}
                                    placeholder={translatedPlaceholders.selectFunctionalityType}
                                    isClearable
                                    className="mt-1"
                                />
                            </label>

                            {/* API Endpoint Select */}
                            <label className="block text-md font-medium text-gray-700">
                                <AutoTranslate>Functionality</AutoTranslate> <span className="text-red-500">*</span>
                                <Select
                                    options={filteredApiEndpoints.map(api => ({
                                        value: api.id,
                                        label: `${api.working}`,
                                        filterLabel: `${api.working}`
                                    }))}
                                    value={
                                        filteredApiEndpoints.find(a => a.id === formData.apiId)
                                            ? {
                                                value: formData.apiId,
                                                label: `${filteredApiEndpoints.find(a => a.id === formData.apiId).working}`
                                            }
                                            : null
                                    }
                                    onChange={(selected) =>
                                        setFormData(prev => ({ ...prev, apiId: selected?.value || '' }))
                                    }
                                    placeholder={translatedPlaceholders.selectFunctionality}
                                    isClearable
                                    isSearchable
                                    isDisabled={!formData.endpointTypeId}
                                    filterOption={(option, input) =>
                                        option.data.filterLabel.toLowerCase().includes(input.toLowerCase())
                                    }
                                    className="mt-1"
                                />
                            </label>
                        </div>

                        {/* Add/Update Button */}
                        <div className="w-1/5 flex items-end">
                            {editingId === null ? (
                                <button
                                    onClick={handleAddAccess}
                                    disabled={isSubmitting}
                                    className={`bg-blue-900 text-white rounded-2xl p-2 w-full flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting
                                        ? <AutoTranslate>Adding...</AutoTranslate>
                                        : <>
                                            <PlusCircleIcon className="h-5 w-5 mr-1" />
                                            <AutoTranslate>Add Access</AutoTranslate>
                                        </>}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSubmitting}
                                    className={`bg-blue-900 text-white rounded-2xl p-2 w-full flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting
                                        ? <AutoTranslate>Updating...</AutoTranslate>
                                        : <>
                                            <CheckCircleIcon className="h-5 w-5 mr-1" />
                                            <AutoTranslate>Update</AutoTranslate>
                                        </>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Show Dropdown */}
                    <div className="flex items-center bg-blue-500 rounded-lg w-auto md:w-32 flex-shrink-0 h-12">
                        <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm whitespace-nowrap">
                            <AutoTranslate>Show:</AutoTranslate>
                        </label>
                        <select
                            id="itemsPerPage"
                            className="border rounded-r-lg p-2 outline-none w-full h-full text-sm"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            {[5, 10, 15, 20].map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filters and Search */}
                    <div className="flex flex-wrap gap-2 w-full md:flex-1 items-center">
                        {/* Role Filter */}
                        <div className="flex-1 min-w-[180px] h-12">
                            <Select
                                options={[{ value: null, label: 'All Roles' }, ...roles.map(role => ({ value: role.id, label: role.role }))]}
                                value={roleFilter ? { value: roleFilter, label: roles.find(r => r.id === roleFilter)?.role } : { value: null, label: 'All Roles' }}
                                onChange={(selected) => setRoleFilter(selected?.value || null)}
                                placeholder="Filter by Role"
                                isClearable={false}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        height: 48,
                                        minHeight: 48,
                                        borderRadius: 6,
                                        paddingLeft: 8,
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        height: 48,
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                    }),
                                    indicatorsContainer: (base) => ({
                                        ...base,
                                        height: 48,
                                    }),
                                    input: (base) => ({
                                        ...base,
                                        margin: 0,
                                        padding: 0,
                                        height: 20,
                                    }),
                                }}
                            />
                        </div>

                        {/* Functionality Type Filter */}
                        <div className="flex-1 min-w-[180px] h-12">
                            <Select
                                options={[{ value: null, label: 'All Types' }, ...endpointTypes.map(type => ({ value: type.id, label: type.name }))]}
                                value={endpointTypeFilter ? { value: endpointTypeFilter, label: endpointTypes.find(t => t.id === endpointTypeFilter)?.name } : { value: null, label: 'All Types' }}
                                onChange={(selected) => setEndpointTypeFilter(selected?.value || null)}
                                placeholder="Filter by Type"
                                isClearable={false}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        height: 48,
                                        minHeight: 48,
                                        borderRadius: 6,
                                        paddingLeft: 8,
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        height: 48,
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                    }),
                                    indicatorsContainer: (base) => ({
                                        ...base,
                                        height: 48,
                                    }),
                                    input: (base) => ({
                                        ...base,
                                        margin: 0,
                                        padding: 0,
                                        height: 20,
                                    }),
                                }}
                            />
                        </div>

                        {/* Text Search */}
                        <div className="flex items-center flex-1 min-w-[200px] h-12">
                            <input
                                type="text"
                                placeholder={translatedPlaceholders.search}
                                className="border rounded-l-md p-2 text-base outline-none w-full h-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-full w-12 border p-2 cursor-pointer" />
                        </div>
                    </div>
                </div>


                {/* Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                                <th className="border p-2 text-left"><AutoTranslate>Role</AutoTranslate></th>
                                <th className="border p-2 text-left"><AutoTranslate>Functionality Type</AutoTranslate></th>
                                <th className="border p-2 text-left"><AutoTranslate>Functionality</AutoTranslate></th>
                                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                                <th className="border p-2 text-center"><AutoTranslate>Action</AutoTranslate></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedList.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center p-4 text-gray-500">
                                        <AutoTranslate>No access records found.</AutoTranslate>
                                    </td>
                                </tr>
                            )}
                            {paginatedList.map((access, index) => {
                                const roleName = getRoleName(access);
                                const apiName = getApiName(access);
                                const endpointTypeName = getEndpointTypeName(access);
                                const isBlocked = access.status;

                                return (
                                    <tr key={access.id} className="hover:bg-slate-50">
                                        <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                        <td className="border p-2">{roleName}</td>
                                        <td className="border p-2">{endpointTypeName}</td>
                                        <td className="border p-2">{apiName}</td>
                                        <td className={`border p-2 font-semibold text-white text-center ${isBlocked ? 'bg-red-500' : 'bg-green-500'}`}>
                                            {isBlocked ? 'Access Denied' : 'Access Allowed'}
                                        </td>
                                        <td className="border p-2 text-center">
                                            <button
                                                onClick={() => handleToggleAccess(access)}
                                                className={`p-1 rounded-full ${isBlocked ? 'bg-green-500' : 'bg-red-500'}`}
                                                title={isBlocked ? 'Click to Allow Access' : 'Click to Block Access'}
                                            >
                                                {isBlocked ?
                                                    <LockOpenIcon className="h-5 w-5 text-white p-0.5" /> :
                                                    <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center mt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1 || totalPages === 0}
                        className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                            }`}
                    >
                        <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                        <AutoTranslate>Previous</AutoTranslate>
                    </button>

                    {totalPages > 0 && getPageNumbers().map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    <span className="text-sm text-gray-700 mx-2">
                        <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                            }`}
                    >
                        <AutoTranslate>Next</AutoTranslate>
                        <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                    </button>
                    <div className="ml-4">
                        <span className="text-sm text-gray-700">
                            <AutoTranslate>
                                {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                                    } to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
                            </AutoTranslate>
                        </span>
                    </div>
                </div>
            </div>

            {/* Modal for Confirm Status Change */}
            {modalVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-lg font-semibold mb-4"><AutoTranslate>Confirm Status Change</AutoTranslate></h2>
                        <p className="mb-4">
                            <AutoTranslate>Are you sure you want to</AutoTranslate>{' '}
                            {accessToToggle?.status ? <AutoTranslate>allow access</AutoTranslate> : <AutoTranslate>block access</AutoTranslate>}{' '}
                            <strong>{getRoleName(accessToToggle)}</strong> / <strong>{getApiName(accessToToggle)}</strong>?
                        </p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">
                                <AutoTranslate>Cancel</AutoTranslate>
                            </button>
                            <button
                                onClick={confirmToggleAccess}
                                disabled={isConfirmDisabled}
                                className={`rounded-md px-4 py-2 text-white ${accessToToggle?.status ? 'bg-green-500' : 'bg-red-500'} ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllowFunctionalityByRole;