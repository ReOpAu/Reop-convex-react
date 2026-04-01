const ADMIN_ROLE_VALUES = new Set(["admin", "owner", "superadmin"]);
function parseAllowlist(value) {
    if (!value) {
        return new Set();
    }
    return new Set(value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean));
}
function includesAdminRole(value) {
    if (typeof value === "string") {
        return ADMIN_ROLE_VALUES.has(value.trim().toLowerCase());
    }
    if (Array.isArray(value)) {
        return value.some((entry) => includesAdminRole(entry));
    }
    if (typeof value === "boolean") {
        return value;
    }
    return false;
}
function metadataIsAdmin(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const metadata = value;
    return (includesAdminRole(metadata.role) ||
        includesAdminRole(metadata.roles) ||
        includesAdminRole(metadata.isAdmin));
}
export function isAdminAccess(identity) {
    const adminEmails = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST);
    const adminUserIds = parseAllowlist(process.env.ADMIN_USER_ID_ALLOWLIST);
    const adminTokenIdentifiers = parseAllowlist(process.env.ADMIN_TOKEN_IDENTIFIER_ALLOWLIST);
    const email = identity.email?.trim().toLowerCase();
    const subject = identity.subject?.trim().toLowerCase();
    const tokenIdentifier = identity.tokenIdentifier?.trim().toLowerCase();
    return ((Boolean(email) && adminEmails.has(email)) ||
        (Boolean(subject) && adminUserIds.has(subject)) ||
        (Boolean(tokenIdentifier) &&
            adminTokenIdentifiers.has(tokenIdentifier)) ||
        includesAdminRole(identity.role) ||
        includesAdminRole(identity.roles) ||
        includesAdminRole(identity.isAdmin) ||
        metadataIsAdmin(identity.publicMetadata) ||
        metadataIsAdmin(identity.privateMetadata) ||
        metadataIsAdmin(identity.sessionClaims));
}
