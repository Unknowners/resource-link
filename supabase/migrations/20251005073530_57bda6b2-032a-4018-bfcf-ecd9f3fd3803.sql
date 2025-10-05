
-- Delete Jira projects and Confluence spaces that are not assigned to any groups
DELETE FROM resources
WHERE integration = 'Anton jira'
  AND NOT EXISTS (
    SELECT 1 FROM resource_permissions rp WHERE rp.resource_id = resources.id
  );
