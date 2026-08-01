import React from 'react';
import { useRealTimeSync } from '../hooks/useRealTimeSync';

export const usePermissions = () => {
  const { data, refresh } = useRealTimeSync([
    {
      key: 'permissions',
      url: '/api/permissions/me',
      transform: (res) => res.permissions || []
    }
  ]);

  const permissions = data.permissions || [];

  const hasPermission = (permId) => {
    return permissions.includes(permId);
  };

  const hasAnyPermission = (permIds) => {
    return permIds.some(id => permissions.includes(id));
  };

  const hasAllPermissions = (permIds) => {
    return permIds.every(id => permissions.includes(id));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh,
    loading: !data.permissions
  };
};

export const PermissionGate = ({ children, permission, anyOf, allOf, fallback = null }) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  let allowed = false;
  if (permission) {
    allowed = hasPermission(permission);
  } else if (anyOf) {
    allowed = hasAnyPermission(anyOf);
  } else if (allOf) {
    allowed = hasAllPermissions(allOf);
  }

  if (!allowed) {
    return fallback;
  }

  return children;
};

export default PermissionGate;
