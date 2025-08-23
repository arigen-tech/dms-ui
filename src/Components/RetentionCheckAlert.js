import React, { useState, useEffect } from 'react';
import {
  
  CheckCircleIcon,
  
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";

const CountdownTimer = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isEligible, setIsEligible] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setIsEligible(true);
      return;
    }

    const timer = setInterval(() => {
      let targetTime;
      if (Array.isArray(targetDate)) {
        // Handle Java LocalDateTime array format [year, month, day, hour, minute, second]
        const [year, month, day, hour, minute, second] = targetDate;
        targetTime = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).getTime();
      } else if (typeof targetDate === "string") {
        // Handle "2025-07-25 14:11:21.433" format
        if (targetDate.includes(' ')) {
          const [datePart, timePart] = targetDate.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [time] = timePart.split('.');
          const [hour, minute, second] = time.split(':').map(Number);
          targetTime = new Date(year, month - 1, day, hour, minute, second).getTime();
        } else {
          targetTime = new Date(targetDate).getTime();
        }
      } else if (targetDate instanceof Date) {
        targetTime = targetDate.getTime();
      } else {
        console.error("Unsupported date format:", targetDate);
        return;
      }

      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsEligible(true);
        if (onComplete) onComplete();
        clearInterval(timer);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (isEligible) {
    return (
      <div className="flex items-center space-x-1 text-sm">
        <div className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
          Ready!
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-sm">
      {timeLeft.days > 0 && (
        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
          {timeLeft.days}d
        </div>
      )}
      <div className="bg-red-100 text-red-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.hours).padStart(2, "0")}h
      </div>
      <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </div>
      <div className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.seconds).padStart(2, "0")}s
      </div>
    </div>
  );
};

const RetentionCheckAlert = ({ onClose, result }) => {
  const [isVisible, setIsVisible] = useState(true);

  const [showMissingFiles, setShowMissingFiles] = useState(false);
  
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  const formatRetentionPeriod = (value, unit, days) => {
    if (!value && !days) return 'N/A';

    if (value && unit) {
      unit = unit.toLowerCase();
      switch (unit) {
        case 'minutes':
          return value === 1 ? '1 minute' : `${value} minutes`;
        case 'hours':
          return value === 1 ? '1 hour' : `${value} hours`;
        case 'days':
          return value === 1 ? '1 day' : `${value} days`;
        case 'months':
          return value === 1 ? '1 month' : `${value} months`;
        default:
          return `${value} ${unit}`;
      }
    }

    if (days) {
      if (days < 1) {
        const minutes = Math.round(days * 24 * 60);
        if (minutes < 60) {
          return minutes === 1 ? '1 minute' : `${minutes} minutes`;
        }
        const hours = Math.round(days * 24);
        return hours === 1 ? '1 hour' : `${hours} hours`;
      }
      return days === 1 ? '1 day' : `${days} days`;
    }

    return 'N/A';
  };

  // Updated function to use retentionDateTime from policy instead of calculating
  const getRetentionDateTime = (policyData) => {
    if (policyData.retentionDateTime && Array.isArray(policyData.retentionDateTime)) {
      return policyData.retentionDateTime;
    }

    // Fallback: combine retentionDate and retentionTime if available
    if (policyData.retentionDate && policyData.retentionTime) {
      const [year, month, day] = policyData.retentionDate;
      const [hour, minute] = policyData.retentionTime;
      return [year, month, day, hour, minute, 0];
    }

    return null;
  };

  const getPolicyBranch = (policyData) => {
    if (policyData.branch && policyData.branch !== 'N/A') {
      return policyData.branch;
    }

    const allDocuments = [
      ...(policyData.movedDocuments || []),
      ...(policyData.notEligibleYet || [])
    ];

    if (allDocuments.length > 0) {
      const branchCounts = {};
      allDocuments.forEach(doc => {
        if (doc.branch && doc.branch !== 'N/A') {
          branchCounts[doc.branch] = (branchCounts[doc.branch] || 0) + 1;
        }
      });

      const mostCommonBranch = Object.keys(branchCounts).reduce((a, b) =>
        branchCounts[a] > branchCounts[b] ? a : b, Object.keys(branchCounts)[0]
      );

      return mostCommonBranch || 'N/A';
    }

    return 'N/A';
  };

  // Helper function to format date from approvalDate or uploadDate
  const formatDate = (doc) => {
    // First try approvalDate (for archived documents)
    const dateToFormat = doc.approvalDate || doc.uploadDate;

    if (!dateToFormat) return 'N/A';

    if (typeof dateToFormat === "string") {
      if (dateToFormat.includes(' ')) {
        const [datePart, timePart] = dateToFormat.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [time, ms] = timePart.split('.');
        const [hour, minute, second] = time.split(':').map(Number);

        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return new Date(dateToFormat).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } else if (Array.isArray(dateToFormat)) {
      const [year, month, day, hour, minute, second] = dateToFormat;
      const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return 'N/A';
  };

  // Helper function to format retention datetime
  const formatRetentionDateTime = (retentionDateTime) => {
    if (!retentionDateTime || !Array.isArray(retentionDateTime)) return 'N/A';

    const [year, month, day, hour, minute] = retentionDateTime;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0);

    return {
      date: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    };
  };

  if (!isVisible) return null;

  const policyResults = result.policyResults || {};
  const totalPoliciesApplied = Object.keys(policyResults).filter(p => p !== 'unknown').length;

  const hasErrors = result.errors && result.errors.length > 0;

  // Check if all documents are archived (no waiting documents)
  const hasWaitingDocuments = Object.values(policyResults).some(policy =>
    policy.notEligibleYet && policy.notEligibleYet.length > 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className={`text-lg font-semibold ${result.error ? "text-red-600" : hasErrors ? "text-yellow-600" : result.success ? "text-green-600" : "text-blue-600"}`}>
            {result.error ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
                Error Running Retention Check
              </>
            ) : hasErrors ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 inline mr-2 text-yellow-600" />
                Retention Check Completed with Warnings
              </>
            ) : result.success ? (
              <>
                <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                Retention Policy Check Results
              </>
            ) : (
              <>
                <ClockIcon className="h-5 w-5 inline mr-2" />
                Retention Check Status
              </>
            )}
          </h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {result.error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              <p>{result.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-800">{result.processedCount || 0}</div>
                  <div className="text-sm text-blue-600">Documents Archived</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{result.totalPoliciesApplied || totalPoliciesApplied}</div>
                  <div className="text-sm text-green-600">Policies Applied</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-800">{result.documentsWithPolicies || 0}</div>
                  <div className="text-sm text-yellow-600">Documents with Policies</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-800">{result.documentsWithoutPolicies || 0}</div>
                  <div className="text-sm text-gray-600">Documents without Policies</div>
                </div>
              </div>

              {/* Policy Results - Only show if there are waiting documents */}
              {totalPoliciesApplied > 0 && hasWaitingDocuments && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Policy-wise Results</h4>

                  {Object.entries(policyResults)
                    .filter(([policyName]) => policyName !== 'unknown')  // Remove default fallback
                    .map(([policyName, policyData]) => {


                      const processedPolicyData = policyData;


                      // Skip if no waiting documents
                      if (!processedPolicyData.notEligibleYet || processedPolicyData.notEligibleYet.length === 0) {
                        return null;
                      }

                      return (
                        <div key={policyName} className="border rounded-lg overflow-hidden">
                          <div
                            className="bg-gray-50 p-4 border-b cursor-pointer hover:bg-gray-100"
                            onClick={() => setSelectedPolicy(selectedPolicy === policyName ? null : policyName)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="font-medium text-gray-900">{processedPolicyData.policyName || `Policy ${policyName}`}</h5>
                                <p className="text-sm text-gray-600">
                                  Retention Period: {formatRetentionPeriod(
                                    processedPolicyData.retentionPeriodValue,
                                    processedPolicyData.retentionPeriodUnit,
                                    processedPolicyData.retentionPeriodDays
                                  )} |
                                  Department: {processedPolicyData.department ? processedPolicyData.department : "All Departments"}
                                  |
                                  Branch: {getPolicyBranch(processedPolicyData)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">{processedPolicyData.movedDocuments?.length || 0}</div>
                                  <div className="text-xs text-gray-500">Archived</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-yellow-600">{processedPolicyData.notEligibleYet?.length || 0}</div>
                                  <div className="text-xs text-gray-500">Waiting</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600">
                                    {(processedPolicyData.movedDocuments?.length || 0) + (processedPolicyData.notEligibleYet?.length || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500">Total</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {selectedPolicy === policyName && (
                            <div className="p-4 space-y-4">
                              {/* Archived Documents */}
                              {processedPolicyData.movedDocuments && processedPolicyData.movedDocuments.length > 0 && (
                                <div>
                                  <h6 className="font-medium text-green-700 mb-2 flex items-center">
                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                    Documents Archived ({processedPolicyData.movedDocuments.length})
                                  </h6>
                                  <div className="max-h-40 overflow-y-auto bg-green-50 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                      <thead className="bg-green-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                            File Name
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                            Approval Date
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                            Department
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                            Branch
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                            Status
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {processedPolicyData.movedDocuments.map((doc, index) => (
                                          <tr key={index} className="hover:bg-green-50">
                                            <td className="px-3 py-2 text-gray-900 font-medium">{doc.fileName}</td>
                                            <td className="px-3 py-2 text-gray-500">
                                              {formatDate(doc)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">{doc.department || 'N/A'}</td>
                                            <td className="px-3 py-2 text-gray-500">{doc.branch || 'N/A'}</td>
                                            <td className="px-3 py-2">
                                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Archived
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Not Eligible Documents with Timer */}
                              {processedPolicyData.notEligibleYet && processedPolicyData.notEligibleYet.length > 0 && (
                                <div>
                                  <h6 className="font-medium text-yellow-700 mb-2 flex items-center">
                                    <ClockIcon className="h-4 w-4 mr-2" />
                                    Documents Waiting for Retention Period ({processedPolicyData.notEligibleYet.length})
                                    <span className="ml-2 text-sm text-gray-500">- Live countdown to eligibility</span>
                                  </h6>
                                  <div className="max-h-60 overflow-y-auto bg-yellow-50 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                      <thead className="bg-yellow-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            File Name
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Upload Date
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Live Countdown
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Will Be Eligible At
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Department
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Branch
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                            Status
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {processedPolicyData.notEligibleYet.map((doc, index) => {
                                          // Use the policy's retentionDateTime instead of calculating from document date
                                          const retentionDateTime = getRetentionDateTime(processedPolicyData);
                                          const formattedRetention = formatRetentionDateTime(retentionDateTime);

                                          const now = new Date();
                                          let eligibleDate = null;

                                          if (retentionDateTime && Array.isArray(retentionDateTime)) {
                                            const [year, month, day, hour, minute] = retentionDateTime;
                                            eligibleDate = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
                                          }

                                          const timeRemaining = eligibleDate ? eligibleDate.getTime() - now.getTime() : 0;
                                          const isEligibleSoon = timeRemaining <= 24 * 60 * 60 * 1000; // 24 hours

                                          return (
                                            <tr key={index} className="hover:bg-yellow-50">
                                              <td className="px-3 py-2 text-gray-900 font-medium">
                                                <div className="flex items-center">
                                                  <span className="truncate max-w-xs" title={doc.fileName}>
                                                    {doc.fileName}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 text-gray-500">
                                                {formatDate(doc)}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                <CountdownTimer
                                                  targetDate={retentionDateTime}
                                                  onComplete={() => {
                                                    console.log(`Document ${doc.fileName} is now eligible for retention!`);
                                                  }}
                                                />
                                              </td>
                                              <td className="px-3 py-2 text-gray-500 text-center">
                                                <div className="text-sm">
                                                  {formattedRetention.date}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                  {formattedRetention.time}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 text-gray-500">{doc.department || 'N/A'}</td>
                                              <td className="px-3 py-2 text-gray-500">{doc.branch || 'N/A'}</td>
                                              <td className="px-3 py-2">
                                                <div className="flex flex-col items-center">
                                                  <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isEligibleSoon
                                                      ? "bg-orange-100 text-orange-800"
                                                      : "bg-yellow-100 text-yellow-800"
                                                      }`}
                                                  >
                                                    {isEligibleSoon ? "Almost Ready!" : "Waiting"}
                                                  </span>
                                                  {isEligibleSoon && (
                                                    <div className="mt-1 text-xs text-orange-600 font-medium animate-pulse">
                                                      Eligible very soon!
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean)}
                </div>
              )}

              {/* Missing Files Section */}
              {result.missingDocuments && result.missingDocuments.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMissingFiles(!showMissingFiles)}
                    className="text-red-600 hover:text-red-800 text-sm underline flex items-center"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {showMissingFiles ? "Hide missing files" : `Show missing files (${result.missingDocuments.length})`}
                  </button>
                  {showMissingFiles && (
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="bg-red-50 p-3 border-b">
                        <h4 className="font-medium text-red-600">Missing Files</h4>
                        <p className="text-sm text-red-500">These files were expected but not found at their specified paths</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                File Name
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                File Path
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Policy
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {result.missingDocuments.map((doc, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                  {doc.fileName || 'Unknown'}
                                </td>
                                <td className="px-4 py-2  text-gray-500 break-all font-mono text-xs">
                                  {doc.path || 'N/A'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">{doc.policy || "Unknown"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Results Message */}
              {result.processedCount === 0 && totalPoliciesApplied === 0 && !hasErrors && (
                <div className="text-center py-8">
                  <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">
                    No documents were eligible for archiving at this time.
                  </p>
                  {result.documentsWithoutPolicies > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {result.documentsWithoutPolicies} documents don't have applicable retention policies.
                    </p>
                  )}
                  {result.documentsWithPolicies > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {result.documentsWithPolicies} documents are waiting for their retention period to expire.
                    </p>
                  )}
                </div>
              )}

              {/* Success Message */}
              {result.success && result.processedCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        Retention Check Completed Successfully
                      </h4>
                      <p className="text-sm text-green-700">
                        {result.processedCount} documents have been archived according to their retention policies.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <button
            onClick={handleClose}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${result.error
              ? "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500"
              : hasErrors
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500"
                : "bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500"
              }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetentionCheckAlert;