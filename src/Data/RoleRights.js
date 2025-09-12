import React, { useState, useEffect } from "react";
import Popup from "../Components/Popup"

import LoadingComponent from '../Components/LoadingComponent';

import { postRequest, putRequest, getRequest } from "../API/apiService";

import { API_HOST, MAS_ROLES, ROLE_TEMPLATE, MAS_TEMPLATE, ASSIGN_TEMPLATES, MAS_APPLICATION, ALL_USER_APPLICATION } from "../API/apiConfig";


const Rolesrights = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [popupMessage, setPopupMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [roleData, setRoleData] = useState([]);
    const [templateData, setTemplateData] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [originalTemplateState, setOriginalTemplateState] = useState([]);

    useEffect(() => {
        fetchRoles(1);
        fetchTemplates(1);
    }, []);

    const fetchRoles = async (flag = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${MAS_ROLES}/getAll/${flag}`);
            console.log("API Response (Roles):", response);
            
            if (response && response.response) {
                const mappedRoles = response.response.map(role => ({
                    id: role.id,
                    roleCode: role.roleCode,
                    roleDesc: role.roleDesc,
                    isActive: role.status?.toLowerCase()
                }));
                setRoleData(mappedRoles);
            } else {
                throw new Error("Invalid response structure");
            }
        } catch (err) {
            console.error("Error fetching roles:", err);
            setError("Failed to fetch roles. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async (flag = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${MAS_TEMPLATE}/getAll/${flag}`);
            
            if (response && response.response) {
                const templateList = response.response || [];
                const mappedTemplates = templateList.map(template => ({
                    id: template.id,
                    code: template.templateCode || "No Code",
                    name: template.templateName || "No Name",
                    status: template.status || "n",
                    checked: false
                }));
                
                setTemplateData(mappedTemplates);
                setTemplates(mappedTemplates);
            } else {
                throw new Error("Invalid template response structure");
            }
        } catch (err) {
            console.error("Error fetching templates:", err);
            setError("Failed to fetch templates. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoleTemplateAssignments = async (roleId, flag = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${ROLE_TEMPLATE}/getAllAssignedTemplates/${roleId}/${flag}`);
            console.log("API Response (Role-Templates):", response);
            
            if (response && response.response) {
                const assignedTemplateIds = response.response.map(item => item.templateId);
                
                // Update templates with checked status based on role assignment
                const updatedTemplates = templateData.map(template => ({
                    ...template,
                    checked: assignedTemplateIds.includes(template.id)
                }));
                
                setTemplates(updatedTemplates);
                
                // Store the original state to track changes
                setOriginalTemplateState(updatedTemplates.map(template => ({
                    id: template.id,
                    checked: template.checked
                })));
            } else {
                // If no templates assigned, uncheck all
                const updatedTemplates = templateData.map(template => ({
                    ...template,
                    checked: false
                }));
                
                setTemplates(updatedTemplates);
                setOriginalTemplateState(updatedTemplates.map(template => ({
                    id: template.id,
                    checked: false
                })));
            }
        } catch (err) {
            console.error("Error fetching role-template assignments:", err);
            setError("Failed to fetch template assignments. Please try again later.");
            
            // Reset templates to unchecked state on error
            const updatedTemplates = templateData.map(template => ({
                ...template,
                checked: false
            }));
            
            setTemplates(updatedTemplates);
            setOriginalTemplateState(updatedTemplates.map(template => ({
                id: template.id,
                checked: false
            })));
        } finally {
            setLoading(false);
        }
    };

    const handleResetClick = () => {
        const selectElement = document.getElementById("roleSelect");
        if (selectElement) {
            selectElement.value = ""; // Reset dropdown to default
        }
        setSelectedRole("");
        setSelectedRoleId(null);
        
        // Reset templates to unchecked state
        setTemplates(prevTemplates => prevTemplates.map(template => ({
            ...template,
            checked: false
        })));
        
        setOriginalTemplateState([]);
    };

    const handleRoleChange = (event) => {
        const selectedValue = event.target.value;
        
        if (!selectedValue) {
            handleResetClick();
            return;
        }
        
        const role = roleData.find(r => r.roleCode === selectedValue);
        
        if (role) {
            setSelectedRole(role.roleCode);
            setSelectedRoleId(role.id);
            fetchRoleTemplateAssignments(role.id, 1); 
        } else {
            showPopup("Error: Selected role not found", "error");
        }
    };
    const handleSave = async () => {
        // Check if a role is selected
        if (!selectedRole || !selectedRoleId) {
            showPopup("Please select a role first!", "warning");
            return;
        }
        
        // Get templates whose status changed (both newly checked and newly unchecked)
        const changedTemplates = templates.filter(template => {
            const originalState = originalTemplateState.find(t => t.id === template.id);
            return originalState && originalState.checked !== template.checked;
        });
        
        if (changedTemplates.length === 0) {
            showPopup("No changes detected. Please modify at least one template assignment.", "warning");
            return;
        }
        
        // Format templates based on their checked status
        const templateUpdates = changedTemplates.map(template => ({
            roleId: selectedRoleId,
            templateId: template.id,
            status: template.checked ? "y" : "n",
            lastChgBy: 0
        }));
        
        setLoading(true);
        try {
            // Match the format from Swagger documentation
            const requestPayload = {
                applicationStatusUpdates: templateUpdates
            };
            
            console.log("Sending payload to API:", JSON.stringify(requestPayload));
            
            // Call API to save the template assignments
            const response = await postRequest(`${ROLE_TEMPLATE}/assignTemplates`, requestPayload);
            
            // Check for numeric status 200 instead of string 'SUCCESS'
            if (response && (response.status === 200 || response.message?.toLowerCase() === 'success')) {
                showPopup("Roles and rights saved successfully!", "success");
                
                // Update the original state to reflect the saved changes
                setOriginalTemplateState(templates.map(template => ({
                    id: template.id,
                    checked: template.checked
                })));
            } else {
                showPopup("Failed to save roles and rights. Please try again.", "error");
            }
        } catch (err) {
            console.error("Error saving role-template assignments:", err);
            showPopup("An error occurred while saving. Please try again later.", "error");
        } finally {
            setLoading(false);
        }
    };

    const showPopup = (message, type = 'info') => {
        setPopupMessage({
            message,
            type,
            onClose: () => {
                setPopupMessage(null);
            }
        });
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl font-semibold text-gray-800">Role Rights</h4>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                                    onClick={() => {
                                        fetchRoles(0);
                                        fetchTemplates(0);
                                        handleResetClick();
                                    }}
                                >
                                    <span className="mr-1">↻</span> Refresh
                                </button>
                            </div>
                        </div>
                        
                        {loading ? (
                            <LoadingComponent />
                        ) : error ? (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                                {error}
                            </div>
                        ) : (
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            id="roleSelect"
                                            value={selectedRole}
                                            onChange={handleRoleChange}
                                            required
                                        >
                                            <option value="">Select Role</option>
                                            {roleData
                                                .filter(role => role.isActive === "y")
                                                .map(role => (
                                                    <option key={role.id} value={role.roleCode}>
                                                        {role.roleDesc}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                                    <table className="min-w-full border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th colSpan="2" className="py-3 px-4 text-left font-semibold text-gray-700 border-b border-gray-200">
                                                    Templates
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {templates.length > 0 ? (
                                                templates.map((template, index) => (
                                                    <tr key={template.id} className="hover:bg-gray-50">
                                                        <td className="py-3 px-4 border-b border-gray-200">{template.name}</td>
                                                        <td className="py-3 px-4 border-b border-gray-200 text-center w-24">
                                                            <div className="flex justify-center">
                                                                <label className="flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                        checked={template.checked || false}
                                                                        onChange={() => {
                                                                            const updatedTemplates = [...templates];
                                                                            updatedTemplates[index].checked = !updatedTemplates[index].checked;
                                                                            setTemplates(updatedTemplates);
                                                                        }}
                                                                        disabled={!selectedRole}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="2" className="py-4 px-4 text-center text-gray-500 border-b border-gray-200">
                                                        No templates available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="flex justify-end space-x-2 mt-6">
                                    <button 
                                        type="button" 
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                        onClick={handleSave}
                                    >
                                        <span className="mr-1">💾</span> Save
                                    </button>
                                    <button 
                                        type="button" 
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
                                        onClick={handleResetClick}
                                    >
                                        <span className="mr-1">↻</span> Reset
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Popup Component */}
                        {showModal && popupMessage && (
                            <Popup
                                message={popupMessage.message}
                                type={popupMessage.type}
                                onClose={() => {
                                    setShowModal(false);
                                    setPopupMessage(null);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rolesrights;