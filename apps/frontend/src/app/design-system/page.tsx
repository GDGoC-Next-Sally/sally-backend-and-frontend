import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './design-system.module.css';

export default function DesignSystemPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logoText}>Sally</span>
          <div>
            <h1 className={styles.pageTitle}>Design System</h1>
            <p className={styles.pageSubtitle}>Sally 서비스의 디자인 토큰 및 컴포넌트 가이드</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── Colors ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Colors</h2>

          <h3 className={styles.groupTitle}>Primary</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Primary" hex="#22CB84" textDark />
            <ColorSwatch name="Primary Mid" hex="#40D294" textDark />
            <ColorSwatch name="Primary Light" hex="#49D098" textDark />
            <ColorSwatch name="Primary BG" hex="#E5F9F0" textDark />
          </div>

          <h3 className={styles.groupTitle}>Alert</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Alert" hex="#FF6F6F" />
            <ColorSwatch name="Alert BG" hex="#FEEEEF" textDark />
          </div>

          <h3 className={styles.groupTitle}>Neutral</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Background" hex="#F5F6F8" textDark />
            <ColorSwatch name="Surface" hex="#FFFFFF" textDark border />
            <ColorSwatch name="Border" hex="#EEEFF2" textDark />
            <ColorSwatch name="Border Mid" hex="#C0C8C5" textDark />
            <ColorSwatch name="Divider" hex="#CDCCCC" textDark />
            <ColorSwatch name="Placeholder" hex="#D9D9D9" textDark />
          </div>

          <h3 className={styles.groupTitle}>Text</h3>
          <div className={styles.colorGrid}>
            <ColorSwatch name="Text Primary" hex="#000000" />
            <ColorSwatch name="Text Secondary" hex="#797C7C" />
            <ColorSwatch name="Text Disabled" hex="#C2C2C2" textDark />
          </div>
        </section>

        {/* ── Typography ────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Typography</h2>
          <p className={styles.groupDesc}>기본 폰트: <strong>Pretendard</strong> &nbsp;|&nbsp; 로고 폰트: <strong>Cafe24 Ssurround</strong></p>

          <div className={styles.typeTable}>
            <TypeRow label="Logo" size="30px" weight="700" sample="Sally" font="Cafe24 Ssurround" color="#22CB84" />
            <TypeRow label="Hero" size="24px" weight="700" sample="3학년 2반" />
            <TypeRow label="Section Title" size="20px" weight="700" sample="주간 AI 인사이트 요약" />
            <TypeRow label="Card Title" size="16px" weight="800" sample="공지사항" />
            <TypeRow label="Body Bold" size="14px" weight="700" sample="클래스 평균 참여도" />
            <TypeRow label="Body SemiBold" size="14px" weight="600" sample="3월 학습 리포트 업데이트 안내" />
            <TypeRow label="Body Medium" size="14px" weight="500" sample="새로운 분석 항목이 추가되었어요." color="#797C7C" />
            <TypeRow label="Caption SemiBold" size="12px" weight="600" sample="더보기" color="#797C7C" />
            <TypeRow label="Caption Medium" size="12px" weight="500" sample="2026.03.04" color="#C2C2C2" />
          </div>
        </section>

        {/* ── Spacing ───────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Spacing</h2>
          <div className={styles.spacingRow}>
            {[4, 8, 12, 16, 20, 24, 39].map((v) => (
              <div key={v} className={styles.spacingItem}>
                <div className={styles.spacingBlock} style={{ width: v, height: v }} />
                <span className={styles.spacingLabel}>{v}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Border Radius ─────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Border Radius</h2>
          <div className={styles.radiusRow}>
            {[
              { label: 'Badge\n5px', r: 5 },
              { label: 'Button\n8px', r: 8 },
              { label: 'Card\n12px', r: 12 },
              { label: 'Pill\n30px', r: 30 },
              { label: 'Avatar\n55px', r: 55 },
            ].map(({ label, r }) => (
              <div key={r} className={styles.radiusItem}>
                <div className={styles.radiusBox} style={{ borderRadius: r }} />
                <span className={styles.radiusLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Components ────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Components</h2>

          {/* Card */}
          <h3 className={styles.groupTitle}>Card</h3>
          <div className={styles.componentRow}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <div className={styles.avatar} />
                  <span className={styles.cardTitle}>공지사항</span>
                </div>
                <button className={styles.moreBtn}>더보기 <ChevronIcon /></button>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.noticeRow}>
                  <span className={styles.noticeTitleText}>3월 학습 리포트 업데이트 안내</span>
                  <span className={styles.noticeDate}>2026.03.04</span>
                </div>
                <p className={styles.noticeDesc}>새로운 분석 항목이 추가되었어요.</p>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <div className={styles.avatar} />
                  <span className={styles.cardTitle}>도움이 필요한 학생</span>
                  <span className={styles.alertCount}>3</span>
                </div>
                <button className={styles.moreBtn}>더보기 <ChevronIcon /></button>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.noticeDesc}>지난 7일간 멘션 요청 3건이 발생했어요.</p>
              </div>
            </div>
          </div>

          {/* Live Class Card */}
          <h3 className={styles.groupTitle}>Live Class Card</h3>
          <div className={styles.componentRow}>
            <div className={styles.liveCard}>
              <div className={styles.liveCardTop}>
                <div className={styles.liveBadge}>LIVE</div>
                <span className={styles.liveCardSub}>진행 중인 수업</span>
              </div>
              <div className={styles.liveCardContent}>
                <p className={styles.liveCardClass}>3학년 2반</p>
                <div className={styles.liveCardMeta}>
                  <span className={styles.liveMetaItem}>🕐 5교시</span>
                  <span className={styles.liveMetaItem}>👤 28</span>
                </div>
              </div>
              <button className={styles.liveActionBtn}>
                <ChevronLeft size={16} />
                실시간 관찰 및 코칭
                <ChevronRight size={16} />
              </button>
            </div>

            <div className={styles.upcomingCard}>
              <div className={styles.upcomingCardInner}>
                <p className={styles.upcomingClass}>3학년 2반</p>
                <div className={styles.liveCardMeta}>
                  <span className={styles.liveMetaItem}>🕐 5교시</span>
                  <span className={styles.liveMetaItem}>👤 28</span>
                </div>
              </div>
              <ChevronRightIcon />
            </div>
          </div>

          {/* Badges */}
          <h3 className={styles.groupTitle}>Badge</h3>
          <div className={styles.badgeRow}>
            <span className={styles.badgeLive}>LIVE</span>
            <span className={styles.badgeAlert}>관심필요</span>
            <span className={styles.badgePrimaryActive}>홈 대시보드</span>
          </div>

          {/* Buttons */}
          <h3 className={styles.groupTitle}>Button</h3>
          <div className={styles.badgeRow}>
            <button className={styles.btnPrimary}>전체 분석 리포트로 이동</button>
            <button className={styles.btnOutline}>전체 분석 리포트로 이동</button>
            <button className={styles.btnGhost}>더보기</button>
          </div>

          {/* Progress Bar */}
          <h3 className={styles.groupTitle}>Progress Bar</h3>
          <div className={styles.progressSection}>
            {[86, 70, 45].map((pct) => (
              <div key={pct} className={styles.progressRow}>
                <span className={styles.progressLabel}>3학년 2반</span>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.progressValue}>{pct}%</span>
              </div>
            ))}
          </div>

          {/* Ranking List */}
          <h3 className={styles.groupTitle}>Ranking List</h3>
          <div className={styles.rankList}>
            {[
              { rank: 1, name: '김고대', class: '3학년 2반', reason: '과제 미제출 2회 연속' },
              { rank: 2, name: '김고대', class: '3학년 2반', reason: '퀴즈 정답률 낮음' },
              { rank: 3, name: '김고대', class: '3학년 2반', reason: '수업 참여도 낮음' },
            ].map(({ rank, name, class: cls, reason }) => (
              <div key={rank} className={styles.rankRow}>
                <span className={`${styles.rankNo} ${rank === 1 ? styles.rankFirst : ''}`}>{rank}</span>
                <span className={styles.rankClass}>{cls}</span>
                <span className={styles.rankName}>{name}</span>
                <span className={styles.rankReason}>{reason}</span>
                <span className={styles.badgeAlert}>관심필요</span>
              </div>
            ))}
          </div>

          {/* Shortcut Item */}
          <h3 className={styles.groupTitle}>Shortcut Item</h3>
          <div className={styles.shortcutGrid}>
            {['내 클래스 관리', '분석 리포트', '공지사항', '설정'].map((label) => (
              <div key={label} className={styles.shortcutItem}>
                <div className={styles.shortcutIcon} />
                <div className={styles.shortcutText}>
                  <span className={styles.shortcutLabel}>{label}</span>
                  <span className={styles.shortcutSub}>클래스 및 학생 관리</span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Bar */}
          <h3 className={styles.groupTitle}>Navigation Bar (GNB)</h3>
          <div className={styles.gnbPreview}>
            <span className={styles.gnbLogo}>Sally</span>
            <div className={styles.gnbNav}>
              <span className={styles.gnbNavItemActive}>🏠 홈 대시보드</span>
              <span className={styles.gnbNavItem}>📚 내 클래스 관리</span>
              <span className={styles.gnbNavItem}>📊 분석 리포트</span>
            </div>
            <div className={styles.gnbProfile}>
              <div className={styles.gnbAvatar} />
              <span className={styles.gnbProfileName}>김샐리 선생님</span>
              <span>▾</span>
            </div>
          </div>

          {/* Dropdown Menu */}
          <h3 className={styles.groupTitle}>Dropdown Menu</h3>
          <div className={styles.dropdownPreview}>
            <div className={styles.dropdown}>
              <span className={styles.dropdownItem}>계정 설정</span>
              <span className={styles.dropdownItem}>알림</span>
              <span className={styles.dropdownItemDanger}>로그아웃</span>
            </div>
          </div>

          {/* AI Insight Box */}
          <h3 className={styles.groupTitle}>AI Insight Box</h3>
          <div className={styles.insightBox}>
            <span className={styles.insightIcon}>✦</span>
            <div>
              <p className={styles.insightText}>수업 참여도가 평소보다 높아요!</p>
              <p className={styles.insightText}>지금의 흐름을 유지하며 코칭해보세요.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

/* ── Small helper components ──────────────────────────── */

function ColorSwatch({ name, hex, textDark, border }: { name: string; hex: string; textDark?: boolean; border?: boolean }) {
  return (
    <div className={styles.swatch}>
      <div
        className={styles.swatchColor}
        style={{ backgroundColor: hex, border: border ? '1px solid #EEEFF2' : undefined }}
      />
      <p className={styles.swatchName}>{name}</p>
      <p className={styles.swatchHex}>{hex}</p>
    </div>
  );
}

function TypeRow({
  label, size, weight, sample, font, color,
}: {
  label: string; size: string; weight: string; sample: string; font?: string; color?: string;
}) {
  return (
    <div className={styles.typeRow}>
      <div className={styles.typeMeta}>
        <span className={styles.typeLabel}>{label}</span>
        <span className={styles.typeSpec}>{size} / {weight}</span>
      </div>
      <span
        className={styles.typeSample}
        style={{
          fontSize: size,
          fontWeight: weight,
          fontFamily: font ? `'${font}', sans-serif` : "'Pretendard', sans-serif",
          color: color ?? '#000',
        }}
      >
        {sample}
      </span>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M6 4L10 8L6 12" stroke="#797C7C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7 4L13 10L7 16" stroke="#22CB84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
