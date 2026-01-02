import React, { useState, useEffect, useCallback } from "react";
import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';
import { postRequest, putRequest, getRequest } from "../API/apiService";
import { MAS_ROLES, ROLE_TEMPLATE, MAS_TEMPLATE } from "../API/apiConfig";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const Rolesrights = () => {
    // Get language context
    const {
        currentLanguage,
        defaultLanguage,
        translationStatus,
        isTranslationNeeded,
        availableLanguages,
        changeLanguage,
        translate,
        preloadTranslationsForTerms
    } = useLanguage();

    // State for tracking data loading
    const [isLoading, setIsLoading] = useState(false);
    
    // State for translated placeholders
    const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
        selectRole: 'Select Role',
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [popupMessage, setPopupMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);
    const [roleData, setRoleData] = useState([]);
    const [templateData, setTemplateData] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [originalTemplateState, setOriginalTemplateState] = useState([]);

    // Debug log
    useEffect(() => {
        console.log('🔍 Rolesrights Component - Language Status:', {
            currentLanguage,
            defaultLanguage,
            isTranslationNeeded: isTranslationNeeded(),
            translationStatus,
            availableLanguagesCount: availableLanguages.length,
            pathname: window.location.pathname
        });
    }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

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

    // Update placeholders when language changes - optimized
    useEffect(() => {
        const updatePlaceholders = async () => {
            // Don't translate if English
            if (!isTranslationNeeded()) {
                setTranslatedPlaceholders({
                    selectRole: 'Select Role',
                });
                return;
            }

            // Only update if language changed
            const selectRolePlaceholder = await translatePlaceholder('Select Role');

            setTranslatedPlaceholders({
                selectRole: selectRolePlaceholder,
            });
        };
        
        updatePlaceholders();
    }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

    useEffect(() => {
        fetchRoles();
        fetchTemplates(1);
    }, []);

    const fetchRoles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${MAS_ROLES}/findActiveRole`);
            console.log("API Response (Roles):", response);

            if (Array.isArray(response)) {
                const mappedRoles = response.map(role => ({
                    id: role.id,
                    roleCode: role.roleCode,
                    role: role.role,
                    isActive: role.isActive
                }));
                setRoleData(mappedRoles);
                console.log('✅ Roles loaded');
            } else {
                throw new Error("Invalid response structure");
            }
        } catch (err) {
            console.error("Error fetching roles:", err);
            setError("Failed to fetch roles. Please try again later.");
            showPopup('Failed to load roles', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async (flag = 1) => {
        setIsLoading(true);
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
                console.log('✅ Templates loaded');
            } else {
                throw new Error("Invalid template response structure");
            }
        } catch (err) {
            console.error("Error fetching templates:", err);
            setError("Failed to fetch templates. Please try again later.");
            showPopup('Failed to load templates', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoleTemplateAssignments = async (roleId, flag = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${ROLE_TEMPLATE}/getAllAssignedTemplates/${roleId}/${flag}`);
            console.log("API Response (Role-Templates):", response);

            if (response && response.response) {
                const assignedTemplateIds = response.response.map(item => item.templateId);

                const updatedTemplates = templateData.map(template => ({
                    ...template,
                    checked: assignedTemplateIds.includes(template.id)
                }));

                setTemplates(updatedTemplates);

                setOriginalTemplateState(updatedTemplates.map(template => ({
                    id: template.id,
                    checked: template.checked
                })));
            } else {
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
            setIsLoading(false);
        }
    };

    const handleResetClick = () => {
        const selectElement = document.getElementById("roleSelect");
        if (selectElement) {
            selectElement.value = "";
        }
        setSelectedRole("");
        setSelectedRoleId(null);

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

        const role = roleData.find(r => r.role === selectedValue);

        if (role) {
            setSelectedRole(role.role);
            setSelectedRoleId(role.id);
            fetchRoleTemplateAssignments(role.id, 1);
        } else {
            showPopup("Error: Selected role not found", "error");
        }
    };

    const handleSave = async () => {
        if (!selectedRole || !selectedRoleId) {
            showPopup("Please select a role first!", "warning");
            return;
        }

        const changedTemplates = templates.filter(template => {
            const originalState = originalTemplateState.find(t => t.id === template.id);
            return originalState && originalState.checked !== template.checked;
        });

        if (changedTemplates.length === 0) {
            showPopup("No changes detected. Please modify at least one template assignment.", "warning");
            return;
        }

        const templateUpdates = changedTemplates.map(template => ({
            roleId: selectedRoleId,
            templateId: template.id,
            status: template.checked ? "y" : "n",
            lastChgBy: 0
        }));

        setIsLoading(true);
        try {
            const requestPayload = {
                applicationStatusUpdates: templateUpdates
            };

            console.log("Sending payload to API:", JSON.stringify(requestPayload));

            const response = await postRequest(`${ROLE_TEMPLATE}/assignTemplates`, requestPayload);

            if (response && (response.status === 200 || response.message?.toLowerCase() === 'success')) {
                showPopup("Roles and rights saved successfully!", "success");

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
            setIsLoading(false);
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

    // Show loading only if initial data is loading
    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <div className="px-2">
            <h4 className="text-2xl mb-1 font-semibold">
                <AutoTranslate>Role Rights</AutoTranslate>
            </h4>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="mb-4 bg-slate-100 p-2 rounded-lg">
                    {isLoading ? (
                        <LoadingComponent />
                    ) : error ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                            {error}
                        </div>
                    ) : (
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="relative">
                                    <label className="block text-lg font-medium text-gray-700 mb-1">
                                        <AutoTranslate>Select Role</AutoTranslate>
                                    </label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        id="roleSelect"
                                        value={selectedRole}
                                        onChange={handleRoleChange}
                                        required
                                    >
                                        <option value="">
                                            <AutoTranslate>{translatedPlaceholders.selectRole}</AutoTranslate>
                                        </option>
                                        {roleData
                                            .filter(role => role.isActive)
                                            .map(role => (
                                                <option key={role.id} value={role.role}>
                                                    {role.role}
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
                                            <th colSpan="2" className="py-3 px-4 text-left font-semibold text-gra-700 border-b border-gray-200">
                                                <AutoTranslate>Templates</AutoTranslate>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templates.length > 0 ? (
                                            templates.map((template, index) => (
                                                <tr key={template.id} className="hover:bg-gray-50">
                                                    <td className="py-3 px-4 border-b border-gray-200">
                                                        {template.name || <AutoTranslate>No Name</AutoTranslate>}
                                                    </td>
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
                                                    <AutoTranslate>No templates available</AutoTranslate>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end space-x-2 mt-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-700 flex items-center"
                                    onClick={handleSave}
                                >
                                    <AutoTranslate>Save</AutoTranslate>
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
                                    onClick={handleResetClick}
                                >
                                    <AutoTranslate>Reset</AutoTranslate>
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
    );
};

export default Rolesrights;