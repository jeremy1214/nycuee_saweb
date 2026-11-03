import { useState } from 'react';
import type { OrganizationContent, OrganizationKind, DepartmentContent, TeamContent, OverviewContent, PublicEesaContent, PublicTeamContent } from '../../../../shared/organization-content';
import { EesaContentContext, TeamContentContext, PreviewNavigationContext } from '../organization/OrganizationContentProvider';
import { EesaLayout } from "../eesa/components/Grid";
import EesaPage from '../eesa/EesaPage';
import DepartmentPage from '../eesa/DepartmentPage';
import DepartmentActivitiesPage from '../eesa/DepartmentActivitiesPage';
import DepartmentActivityPage from '../eesa/DepartmentActivityPage';
import DepartmentSkillsPage from '../eesa/DepartmentSkillsPage';
import DepartmentExperiencePage from '../eesa/DepartmentExperiencePage';
import TeamPage from '../teams/TeamPage';
import TeamDetailPage from '../teams/TeamDetailPage';
import { apiRequest } from './api';
import { useResource, ResourceState } from './cmsUi';
import { mediaPreview } from './mediaPreview';
function images(value: unknown): unknown { if (Array.isArray(value)) return value.map(images); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'src' && typeof child === 'string' ? mediaPreview(child) : images(child)])); return value; }
export function OrganizationPreview({ kind, id, content }: { kind: OrganizationKind; id: string; content: OrganizationContent }) {
  const [path, setPath] = useState(kind === 'overview' ? '/eesa' : kind === 'department' ? `/eesa/${id}` : `/team/${id}`);
  const baseline = useResource(async () => kind === 'team'
    ? { eesa: { overview: null, departments: [] } as PublicEesaContent, teams: await apiRequest<PublicTeamContent>('public/teams/content') }
    : { eesa: await apiRequest<PublicEesaContent>('public/eesa/content'), teams: { teams: [] } as PublicTeamContent }, [kind]);
  const normalized = images(content) as OrganizationContent;
  const eesa = images({ overview: kind === 'overview' ? normalized as OverviewContent : baseline.data?.eesa.overview ?? null,
    departments: [...(baseline.data?.eesa.departments ?? []).filter(d => kind !== 'department' || d.id !== id), ...(kind === 'department' ? [normalized as DepartmentContent] : [])].sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) }) as PublicEesaContent;
  const teams = images({ teams: [...(baseline.data?.teams.teams ?? []).filter(t => kind !== 'team' || t.id !== id), ...(kind === 'team' ? [normalized as TeamContent] : [])].sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) }) as PublicTeamContent;
  const parts = path.split('?')[0].split('/');
  const view = parts[1] === 'team' ? parts[2] ? <TeamDetailPage /> : <TeamPage /> : !parts[2] ? <EesaPage /> : parts[3] === 'skills' ? <DepartmentSkillsPage /> : parts[3] === 'experiences' ? <DepartmentExperiencePage /> : parts[3] === 'activities' ? parts[4] ? <DepartmentActivityPage /> : <DepartmentActivitiesPage /> : <DepartmentPage />;
  return <div className="cms-preview"><p className="cms-notice">目前內容預覽；連結與切換保留在後台。</p><button onClick={() => setPath(kind === 'overview' ? '/eesa' : kind === 'department' ? `/eesa/${id}` : `/team/${id}`)}>返回預覽起點</button><ResourceState {...baseline} retry={baseline.reload}><div onClickCapture={event => { const link = (event.target as Element).closest('a'); if (link) { const href = link.getAttribute('href') ?? ''; const destination = href.includes('#') ? href.split('#')[1] : href; event.preventDefault(); event.stopPropagation(); if (destination.startsWith('/eesa') || destination.startsWith('/team')) setPath(destination); } }}><PreviewNavigationContext.Provider value={{ path, navigate: setPath }}><EesaContentContext.Provider value={{ status: 'ready', data: eesa, refresh() {} }}><TeamContentContext.Provider value={{ status: 'ready', data: teams, refresh() {} }}>{parts[1] === "team" ? view : <EesaLayout>{view}</EesaLayout>}</TeamContentContext.Provider></EesaContentContext.Provider></PreviewNavigationContext.Provider></div></ResourceState></div>;
}
