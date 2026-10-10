import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageContainer, SectionHeading } from "../../components/SiteChrome";
import NotFoundPage from "../../pages/NotFoundPage";
import { getTeamImage, teams, teamsData, type TeamData, type ScheduleBlock } from "./data";
import "./teams.css";

function ScheduleContent({ block }: { block: ScheduleBlock }) {
  if (block.type === "list") return <ul>{block.items?.map((item, index) => <li key={index}>{item}</li>)}</ul>;
  if (block.type === "subheader") return <h3>{block.text}</h3>;
  return <p>{block.text}</p>;
}

function TeamDetails({ team, teamKey }: { team: TeamData; teamKey: string }) {
  const [activityId, setActivityId] = useState(team.activities[0]?.id ?? null);
  const activeActivity = team.activities.find((activity) => activity.id === activityId);
  const currentIndex = teams.findIndex((entry) => entry.key === teamKey);
  const previous = teams[currentIndex - 1];
  const next = teams[currentIndex + 1];

  return (
    <main className="teams-detail-page">
      <PageContainer>
        <nav className="teams-breadcrumb" aria-label="所在位置">
          <Link to="/">首頁</Link><span aria-hidden="true">/</span>
          <Link to="/team">系隊</Link><span aria-hidden="true">/</span>
          <span aria-current="page">{team.name}</span>
        </nav>
        <div className="teams-detail-heading">
          <div><span className="eyebrow">DEPARTMENT TEAMS</span><h1>電機{team.name}</h1></div>
          <Link className="teams-back-link" to="/team">所有系隊 <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="teams-detail-photo"><img src={getTeamImage(team.photo)} alt={`${team.name}隊伍合照`} /></div>
        <section className="teams-detail-section">
          <SectionHeading eyebrow="ABOUT THE TEAM" title="隊伍介紹" />
          <div className="teams-content-panel teams-introduction">{team.intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        </section>
        <section className="teams-detail-section">
          <SectionHeading eyebrow="PRACTICE SCHEDULE" title="練習時間" />
          <div className="teams-content-panel teams-schedule">
            <div>{team.schedule.map((block, index) => <ScheduleContent key={index} block={block} />)}</div>
            {team.ballIcon && <img className="teams-ball-icon" src={getTeamImage(team.ballIcon)} alt={`${team.name}球類圖示`} />}
          </div>
        </section>
        <section className="teams-detail-section">
          <SectionHeading eyebrow="TEAM ACTIVITIES" title="活動介紹" />
          <div className="teams-activities-layout">
            <nav className="teams-activity-list" aria-label={`${team.name}活動選擇`}>
              {team.activities.map((activity) => (
                <button key={activity.id} type="button" className={activity.id === activityId ? "is-active" : ""} aria-pressed={activity.id === activityId} onClick={() => setActivityId(activity.id)} onMouseEnter={() => setActivityId(activity.id)}>
                  <span className="teams-activity-month">{activity.month}</span>
                  <strong>{activity.name}</strong>
                  <span className="teams-activity-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </nav>
            <div className="teams-content-panel teams-activity-detail" aria-live="polite">
              {activeActivity && <>
                <span className="eyebrow">{activeActivity.month}</span>
                <h3>{activeActivity.name}</h3>
                <p>{activeActivity.description}</p>
                {activeActivity.image && <img src={getTeamImage(activeActivity.image)} alt={`${team.name}${activeActivity.name}`} />}
              </>}
            </div>
          </div>
        </section>
        <section className="teams-detail-section">
          <SectionHeading eyebrow="JOIN THE TEAM" title="聯絡資訊與入隊方法" />
          <div className="teams-content-panel teams-contact-panel">
            <div>
              {team.contact.intro && <p>{team.contact.intro}</p>}
              {team.contact.people.map((person, index) => <div className="teams-contact-person" key={index}>
                {person.header && <h3>{person.header}</h3>}
                {person.lines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
              </div>)}
              {team.contact.note && <p className="teams-contact-note">{team.contact.note}</p>}
            </div>
            {team.aboutImg && <img className="teams-contact-image" src={getTeamImage(team.aboutImg)} alt={`${team.name}入隊資訊`} />}
          </div>
        </section>
        <nav className="teams-bottom-nav" aria-label="切換系隊">
          {previous ? <Link to={`/team/${previous.key}`}><span aria-hidden="true">←</span>{previous.name}</Link> : <span />}
          <Link className="teams-bottom-all" to="/team">系隊總覽</Link>
          {next ? <Link to={`/team/${next.key}`}>{next.name}<span aria-hidden="true">→</span></Link> : <span />}
        </nav>
      </PageContainer>
    </main>
  );
}

export default function TeamDetailPage() {
  const { teamKey = "" } = useParams();
  const team = teamsData[teamKey];
  if (!team) return <NotFoundPage />;
  return <TeamDetails key={teamKey} team={team} teamKey={teamKey} />;
}
