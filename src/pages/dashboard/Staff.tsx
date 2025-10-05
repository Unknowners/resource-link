import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, MoreVertical, Trash2, Edit, ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InviteUserDialog } from "@/components/dashboard/InviteUserDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  status: string;
  invitation_status: string;
  groups: string[];
  positions: string[];
  projects: string[];
  requires_onboarding: boolean;
  is_pending_invite?: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

interface Position {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [editingRole, setEditingRole] = useState<string>("member");
  const [editingStatus, setEditingStatus] = useState<string>("active");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadStaff();
    loadGroups();
    loadPositions();
    loadProjects();
  }, [currentPage]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;
      setOrganizationId(member.organization_id);

      // Get total count for pagination
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id);

      setTotalCount(count || 0);

      // Get paginated members
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role, status, invitation_status')
        .eq('organization_id', member.organization_id)
        .range(from, to);

      if (!members) return;

      // Get profiles for all members
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, requires_onboarding')
        .in('id', members.map(m => m.user_id));

      if (!profiles) return;

      // Get group memberships
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('user_id, group_id, groups(name)')
        .in('user_id', members.map(m => m.user_id));

      // Get user positions
      const { data: userPositions } = await supabase
        .from('user_positions')
        .select('user_id, position_id, positions(name)')
        .in('user_id', members.map(m => m.user_id));

      // Get user projects
      const { data: userProjects } = await supabase
        .from('user_projects')
        .select('user_id, project_id, projects(name)')
        .in('user_id', members.map(m => m.user_id));

      // Get pending invitations
      const { data: pendingInvites } = await supabase
        .from('invitations')
        .select('email, role, created_at, expires_at')
        .eq('organization_id', member.organization_id)
        .is('accepted_at', null);

      // Combine existing members data
      const staffData: StaffMember[] = profiles.map(profile => {
        const memberData = members.find(m => m.user_id === profile.id);
        const userGroups = groupMemberships
          ?.filter(gm => gm.user_id === profile.id)
          .map(gm => (gm.groups as any)?.name)
          .filter(Boolean) || [];
        
        const userPositionsList = userPositions
          ?.filter(up => up.user_id === profile.id)
          .map(up => (up.positions as any)?.name)
          .filter(Boolean) || [];

        const userProjectsList = userProjects
          ?.filter(up => up.user_id === profile.id)
          .map(up => (up.projects as any)?.name)
          .filter(Boolean) || [];

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          role: memberData?.role || 'member',
          status: memberData?.status || 'active',
          invitation_status: memberData?.invitation_status || 'accepted',
          groups: userGroups,
          positions: userPositionsList,
          projects: userProjectsList,
          requires_onboarding: profile.requires_onboarding ?? true,
          is_pending_invite: false
        };
      });

      // Add pending invitations
      if (pendingInvites) {
        pendingInvites.forEach(invite => {
          staffData.push({
            id: invite.email,
            first_name: null,
            last_name: null,
            email: invite.email,
            role: invite.role || 'member',
            status: 'pending',
            invitation_status: 'pending',
            groups: [],
            positions: [],
            projects: [],
            requires_onboarding: true,
            is_pending_invite: true
          });
        });
      }

      setStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error("Помилка завантаження співробітників");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .eq('organization_id', member.organization_id);

      if (groups) {
        setAllGroups(groups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadPositions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const { data: positions } = await supabase
        .from('positions')
        .select('id, name, slug')
        .eq('organization_id', member.organization_id);

      if (positions) {
        setAllPositions(positions);
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('organization_id', member.organization_id);

      if (projects) {
        setAllProjects(projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleEditUser = async (user: StaffMember) => {
    setEditingUser(user);
    setEditingRole(user.role);
    setEditingStatus(user.status);
    
    // Get current user's groups
    const { data: userGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    const groupIds = new Set(userGroups?.map(g => g.group_id) || []);
    setSelectedGroups(groupIds);

    // Get current user's positions
    const { data: userPositions } = await supabase
      .from('user_positions')
      .select('position_id')
      .eq('user_id', user.id);

    const positionIds = new Set(userPositions?.map(p => p.position_id) || []);
    setSelectedPositions(positionIds);

    // Get current user's projects
    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('project_id')
      .eq('user_id', user.id);

    const projectIds = new Set(userProjects?.map(p => p.project_id) || []);
    setSelectedProjects(projectIds);

    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !organizationId) return;

    try {
      // Update profile (first_name, last_name, email)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          email: editingUser.email
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role and status
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ 
          role: editingRole,
          status: editingStatus
        })
        .eq('user_id', editingUser.id)
        .eq('organization_id', organizationId);

      if (updateError) throw updateError;

      // Get current groups
      const { data: currentGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', editingUser.id);

      const currentGroupIds = new Set(currentGroups?.map(g => g.group_id) || []);

      // Find groups to add and remove
      const groupsToAdd = Array.from(selectedGroups).filter(id => !currentGroupIds.has(id));
      const groupsToRemove = Array.from(currentGroupIds).filter(id => !selectedGroups.has(id));

      // Add user to new groups
      if (groupsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('group_members')
          .insert(groupsToAdd.map(group_id => ({
            group_id,
            user_id: editingUser.id
          })));

        if (addError) throw addError;
      }

      // Remove user from groups
      if (groupsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('group_members')
          .delete()
          .eq('user_id', editingUser.id)
          .in('group_id', groupsToRemove);

        if (removeError) throw removeError;
      }

      // Handle positions
      const { data: currentPositions } = await supabase
        .from('user_positions')
        .select('position_id')
        .eq('user_id', editingUser.id);

      const currentPositionIds = new Set(currentPositions?.map(p => p.position_id) || []);
      const positionsToAdd = Array.from(selectedPositions).filter(id => !currentPositionIds.has(id));
      const positionsToRemove = Array.from(currentPositionIds).filter(id => !selectedPositions.has(id));

      if (positionsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('user_positions')
          .insert(positionsToAdd.map(position_id => ({
            position_id,
            user_id: editingUser.id,
            organization_id: organizationId
          })));

        if (addError) throw addError;
      }

      if (positionsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_positions')
          .delete()
          .eq('user_id', editingUser.id)
          .in('position_id', positionsToRemove);

        if (removeError) throw removeError;
      }

      // Handle projects
      const { data: currentProjects } = await supabase
        .from('user_projects')
        .select('project_id')
        .eq('user_id', editingUser.id);

      const currentProjectIds = new Set(currentProjects?.map(p => p.project_id) || []);
      const projectsToAdd = Array.from(selectedProjects).filter(id => !currentProjectIds.has(id));
      const projectsToRemove = Array.from(currentProjectIds).filter(id => !selectedProjects.has(id));

      if (projectsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('user_projects')
          .insert(projectsToAdd.map(project_id => ({
            project_id,
            user_id: editingUser.id,
            organization_id: organizationId
          })));

        if (addError) throw addError;
      }

      if (projectsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_projects')
          .delete()
          .eq('user_id', editingUser.id)
          .in('project_id', projectsToRemove);

        if (removeError) throw removeError;
      }

      toast.success("Користувача оновлено");
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setShowPasswordReset(false);
      setNewPassword("");
      loadStaff();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Помилка оновлення користувача");
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;

    if (!newPassword || newPassword.length < 8) {
      toast.error("Пароль повинен містити мінімум 8 символів");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          userId: editingUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Пароль успішно змінено");
      setShowPasswordReset(false);
      setNewPassword("");
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Помилка оновлення користувача");
    }
  };

  const toggleGroup = (groupId: string) => {
    const newSelectedGroups = new Set(selectedGroups);
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId);
    } else {
      newSelectedGroups.add(groupId);
    }
    setSelectedGroups(newSelectedGroups);
  };

  const togglePosition = (positionId: string) => {
    const newSelectedPositions = new Set(selectedPositions);
    if (newSelectedPositions.has(positionId)) {
      newSelectedPositions.delete(positionId);
    } else {
      newSelectedPositions.add(positionId);
    }
    setSelectedPositions(newSelectedPositions);
  };

  const toggleProject = (projectId: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    if (newSelectedProjects.has(projectId)) {
      newSelectedProjects.delete(projectId);
    } else {
      newSelectedProjects.add(projectId);
    }
    setSelectedProjects(newSelectedProjects);
  };

  const handleInviteUser = async () => {
    if (!organizationId) {
      toast.error("Організація не знайдена");
      return;
    }

    if (!inviteEmail || !inviteFirstName || !inviteLastName || !invitePassword) {
      toast.error("Заповніть всі поля");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Введіть коректну email адресу");
      return;
    }

    if (invitePassword.length < 8) {
      toast.error("Пароль повинен містити мінімум 8 символів");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: inviteEmail,
          password: invitePassword,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          role: inviteRole,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Користувача створено успішно");
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInvitePassword("");
      setInviteRole("member");
      loadStaff();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || "Помилка створення користувача");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Користувача видалено повністю");
      loadStaff();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || "Помилка видалення користувача");
    }
  };

  const handleDeleteInvitation = async (email: string) => {
    if (!organizationId) return;
    
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('email', email)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast.success("Запрошення видалено");
      loadStaff();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error("Помилка видалення запрошення");
    }
  };

  const handleResendInvitation = async (user: StaffMember) => {
    if (!organizationId) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", currentUser.id)
        .single();

      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .single();

      const inviterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Колега';
      const organizationName = organization?.name || 'вашу організацію';

      const { error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: user.email,
          organizationName,
          inviterName,
        },
      });

      if (error) throw error;

      toast.success(`Запрошення повторно надіслано на ${user.email}`);
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error("Помилка відправки запрошення");
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="default">Owner</Badge>;
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "member":
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Активний
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Заблокований
      </Badge>
    );
  };

  const getInvitationBadge = (invitationStatus: string) => {
    // Показуємо статус тільки якщо це реально запрошення (pending)
    // Для звичайних користувачів (accepted) не показуємо нічого
    if (invitationStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Очікує підтвердження
        </Badge>
      );
    }
    // Для accepted повертаємо "-" або просто порожнє
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2">Staff</h1>
          <p className="text-muted-foreground">
            Manage team members and their access
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Створити користувача
          </Button>
          {/* <InviteUserDialog /> */}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Пошук користувачів..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Завантаження...
            </div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Користувачів не знайдено
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Користувач</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Онбординг</TableHead>
                  <TableHead>Групи</TableHead>
                  <TableHead>Посади</TableHead>
                  <TableHead>Проекти</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user.is_pending_invite 
                              ? '📧' 
                              : getInitials(user.first_name || '', user.last_name || '')
                            }
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.is_pending_invite 
                            ? 'Запрошення надіслано' 
                            : `${user.first_name} ${user.last_name}`
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {user.requires_onboarding ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Потрібен
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Завершено
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.groups.length > 0 ? user.groups.map((group, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        )) : <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.positions.length > 0 ? user.positions.map((position, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {position}
                          </Badge>
                        )) : <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.projects.length > 0 ? user.projects.map((project, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {project}
                          </Badge>
                        )) : <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!user.is_pending_invite && (
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Редагувати
                            </DropdownMenuItem>
                          )}
                          {user.invitation_status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleResendInvitation(user)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Надіслати знову
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => user.is_pending_invite 
                              ? handleDeleteInvitation(user.email!) 
                              : handleRemoveMember(user.id)
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!loading && totalCount > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Сторінка {currentPage} з {totalPages} ({totalCount} користувачів)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Попередня
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Наступна
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Створити користувача</DialogTitle>
            <DialogDescription>
              Створіть нового користувача для вашої організації
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">Ім'я *</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Іван"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Прізвище *</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Іваненко"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль * (мінімум 8 символів)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Роль</Label>
              <select
                id="role"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={handleInviteUser}>
                Створити
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Редагувати користувача</DialogTitle>
            <DialogDescription>
              Управління для {editingUser?.first_name} {editingUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основне</TabsTrigger>
              <TabsTrigger value="groups">Групи</TabsTrigger>
              <TabsTrigger value="positions">Посади</TabsTrigger>
              <TabsTrigger value="projects">Проекти</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-first-name">Ім'я</Label>
                    <Input
                      id="edit-first-name"
                      value={editingUser?.first_name || ''}
                      onChange={(e) => setEditingUser(prev => prev ? {...prev, first_name: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-last-name">Прізвище</Label>
                    <Input
                      id="edit-last-name"
                      value={editingUser?.last_name || ''}
                      onChange={(e) => setEditingUser(prev => prev ? {...prev, last_name: e.target.value} : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser?.email || ''}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, email: e.target.value} : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-role">Роль</Label>
                  <Select value={editingRole} onValueChange={setEditingRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-status">Статус</Label>
                  <Select value={editingStatus} onValueChange={setEditingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активний</SelectItem>
                      <SelectItem value="blocked">Заблокований</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base">Змінити пароль</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordReset(!showPasswordReset)}
                    >
                      {showPasswordReset ? "Скасувати" : "Змінити пароль"}
                    </Button>
                  </div>
                  {showPasswordReset && (
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Новий пароль (мінімум 8 символів)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        onClick={handleResetPassword}
                        className="w-full"
                        variant="secondary"
                      >
                        Встановити новий пароль
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="groups" className="space-y-4 mt-4">
                <div>
                  <Label className="text-base mb-3 block">Обрані групи</Label>
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-2 border rounded-md">
                    {selectedGroups.size === 0 ? (
                      <span className="text-sm text-muted-foreground">Групи не обрано</span>
                    ) : (
                      Array.from(selectedGroups).map(groupId => {
                        const group = allGroups.find(g => g.id === groupId);
                        return group ? (
                          <Badge key={groupId} variant="secondary" className="gap-1">
                            {group.name}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => toggleGroup(groupId)}
                            />
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  
                  <Label className="text-sm mb-2 block">Додати групу</Label>
                  <Select onValueChange={(value) => toggleGroup(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть групу..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allGroups.filter(g => !selectedGroups.has(g.id)).map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div>
                            <div className="font-medium">{group.name}</div>
                            {group.description && (
                              <div className="text-xs text-muted-foreground">{group.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {allGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Немає доступних груп
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="positions" className="space-y-4 mt-4">
                <div>
                  <Label className="text-base mb-3 block">Обрані посади</Label>
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-2 border rounded-md">
                    {selectedPositions.size === 0 ? (
                      <span className="text-sm text-muted-foreground">Посади не обрано</span>
                    ) : (
                      Array.from(selectedPositions).map(positionId => {
                        const position = allPositions.find(p => p.id === positionId);
                        return position ? (
                          <Badge key={positionId} variant="secondary" className="gap-1">
                            {position.name}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => togglePosition(positionId)}
                            />
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  
                  <Label className="text-sm mb-2 block">Додати посаду</Label>
                  <Select onValueChange={(value) => togglePosition(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть посаду..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allPositions.filter(p => !selectedPositions.has(p.id)).map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {allPositions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Немає доступних посад
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4 mt-4">
                <div>
                  <Label className="text-base mb-3 block">Обрані проекти</Label>
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-2 border rounded-md">
                    {selectedProjects.size === 0 ? (
                      <span className="text-sm text-muted-foreground">Проекти не обрано</span>
                    ) : (
                      Array.from(selectedProjects).map(projectId => {
                        const project = allProjects.find(p => p.id === projectId);
                        return project ? (
                          <Badge key={projectId} variant="secondary" className="gap-1">
                            {project.name}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => toggleProject(projectId)}
                            />
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                  
                  <Label className="text-sm mb-2 block">Додати проект</Label>
                  <Select onValueChange={(value) => toggleProject(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть проект..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.filter(p => !selectedProjects.has(p.id)).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {allProjects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Немає доступних проектів
                    </p>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <div className="flex gap-2 justify-end border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSaveUser}>
              Зберегти
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
