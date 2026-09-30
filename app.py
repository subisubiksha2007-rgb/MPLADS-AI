import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from sklearn.ensemble import IsolationForest

# =========================================================
# PAGE CONFIGURATION & GOVERNMENT-STYLE THEME
# =========================================================

st.set_page_config(
    page_title="MPLADS AI | Portal",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom GovTech Style CSS
st.markdown("""
<style>
    /* Government Header Styling */
    .gov-banner {
        background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
        color: #ffffff;
        padding: 1.25rem 1.75rem;
        border-radius: 12px;
        border-left: 6px solid #f59e0b;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .gov-banner h1 {
        color: #ffffff;
        font-size: 1.85rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
        letter-spacing: -0.025em;
    }
    .gov-banner p {
        color: #cbd5e1;
        font-size: 0.95rem;
        margin-bottom: 0;
    }
    .gov-badge {
        display: inline-block;
        padding: 0.25rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .badge-active {
        background-color: rgba(16, 185, 129, 0.2);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .advisory-box {
        background-color: #f8fafc;
        border-left: 4px solid #3b82f6;
        padding: 0.85rem 1.25rem;
        border-radius: 6px;
        margin-bottom: 1.25rem;
        font-size: 0.88rem;
        color: #334155;
    }
</style>
""", unsafe_allow_html=True)

# =========================================================
# LOAD DATA
# =========================================================

@st.cache_data
def load_data():
    return pd.read_csv("data.csv")

try:
    df = load_data()
except Exception as e:
    st.error(f"Error loading data.csv: {e}")
    st.stop()

# =========================================================
# BASIC CALCULATIONS
# =========================================================

df["utilization_percent"] = (
    df["spent_amount"] / df["approved_amount"] * 100
).round(1)

# =========================================================
# AI ANOMALY DETECTION (ISOLATION FOREST)
# =========================================================

features = [
    "approved_amount",
    "spent_amount",
    "progress_percent",
    "delay_days"
]

model = IsolationForest(
    contamination=0.20,
    random_state=42
)

df["ai_prediction"] = model.fit_predict(df[features])

df["ai_anomaly"] = df["ai_prediction"].apply(
    lambda x: "Anomaly Detected" if x == -1 else "Normal"
)

# Decision function score (more negative = more anomalous)
df["anomaly_score"] = model.decision_function(df[features]).round(3)

# =========================================================
# RISK LEVEL EVALUATION
# =========================================================

def calculate_risk(row):
    score = 0

    # High spending + low progress
    if row["utilization_percent"] > 80 and row["progress_percent"] < 40:
        score += 50

    # Project delay
    if row["delay_days"] > 60:
        score += 30
    elif row["delay_days"] > 30:
        score += 15

    # Very low progress
    if row["progress_percent"] < 30:
        score += 20

    # AI anomaly
    if row["ai_anomaly"] == "Anomaly Detected":
        score += 20

    if score >= 70:
        return "High Risk"
    elif score >= 40:
        return "Medium Risk"
    else:
        return "Low Risk"

df["risk_level"] = df.apply(calculate_risk, axis=1)

# =========================================================
# RISK REASON GENERATOR
# =========================================================

def get_reason(row):
    reasons = []

    if row["utilization_percent"] > 80 and row["progress_percent"] < 40:
        reasons.append("High expenditure compared with work progress")

    if row["delay_days"] > 60:
        reasons.append("Significant project delay (>60 days)")
    elif row["delay_days"] > 30:
        reasons.append("Project delay requires monitoring (>30 days)")

    if row["progress_percent"] < 30:
        reasons.append("Very low work progress (<30%)")

    if row["ai_anomaly"] == "Anomaly Detected":
        reasons.append("AI detected an unusual multi-feature pattern")

    if not reasons:
        return "No major anomaly detected"

    return " | ".join(reasons)

df["risk_reason"] = df.apply(get_reason, axis=1)

# =========================================================
# SIDEBAR FILTERS & BRANDING
# =========================================================

st.sidebar.markdown("""
<div style="padding: 0.5rem 0;">
    <h2 style="margin: 0; font-size: 1.4rem; color: #1e3a8a;">🏛️ MPLADS AI</h2>
    <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 500;">
        Member of Parliament Local Area Development Scheme
    </p>
    <div style="margin-top: 0.5rem;">
        <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
            INTELLIGENT AUDIT SYSTEM
        </span>
    </div>
</div>
""", unsafe_allow_html=True)

st.sidebar.markdown("---")
st.sidebar.subheader("🔎 Filter & Slice Data")

districts = ["All"] + sorted(df["district"].unique().tolist())
categories = ["All"] + sorted(df["category"].unique().tolist())
risk_levels = ["All", "Low Risk", "Medium Risk", "High Risk"]
completion_statuses = ["All"] + sorted(df["completion_status"].unique().tolist())

selected_district = st.sidebar.selectbox("District", districts)
selected_category = st.sidebar.selectbox("Category", categories)
selected_risk = st.sidebar.selectbox("Risk Level", risk_levels)
selected_status = st.sidebar.selectbox("Completion Status", completion_statuses)

# Filter Dataframe
filtered_df = df.copy()

if selected_district != "All":
    filtered_df = filtered_df[filtered_df["district"] == selected_district]

if selected_category != "All":
    filtered_df = filtered_df[filtered_df["category"] == selected_category]

if selected_risk != "All":
    filtered_df = filtered_df[filtered_df["risk_level"] == selected_risk]

if selected_status != "All":
    filtered_df = filtered_df[filtered_df["completion_status"] == selected_status]

st.sidebar.markdown("---")
st.sidebar.markdown(f"**Records Displayed:** `{len(filtered_df)}` of `{len(df)}`")

# Reset Filter button
if st.sidebar.button("🔄 Reset Filters", use_container_width=True):
    st.rerun()

st.sidebar.markdown("---")
st.sidebar.caption("TEAM NOVA | National Hackathon Prototype")
st.sidebar.caption("Compliant with MoSPI MPLADS Implementation Guidelines")

# =========================================================
# MAIN HEADER & ADVISORY BANNER
# =========================================================

st.markdown("""
<div class="gov-banner">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #fbbf24; font-weight: 600;">
                Government Project Vigilance &amp; Anomaly Monitoring Portal
            </div>
            <h1>🏛️ MPLADS-AI Intelligence Dashboard</h1>
            <p>Automated Anomaly Detection &amp; Fund Utilization Auditing for Constituency Development Projects</p>
        </div>
        <div style="align-self: center;">
            <span class="gov-badge badge-active">🟢 Active Vigilance Engine</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Mandatory Investigation Disclaimer Banner
st.info(
    "ℹ️ **Audit & Vigilance Advisory**: AI Anomaly Detection flags unusual project patterns "
    "(such as high fund drawdown with disproportionately low physical progress or chronic delays) "
    "for **prioritized administrative inspection**. Anomaly flags are signals for on-site inquiry "
    "and **do not automatically establish fraud or malfeasance**.",
    icon="ℹ️"
)

# =========================================================
# KPI METRICS CARDS (5 METRICS)
# =========================================================

total_projects = len(filtered_df)
total_approved = filtered_df["approved_amount"].sum()
total_spent = filtered_df["spent_amount"].sum()
overall_utilization = (total_spent / total_approved * 100) if total_approved > 0 else 0
anomalies_count = len(filtered_df[filtered_df["ai_anomaly"] == "Anomaly Detected"])
high_risk_count = len(filtered_df[filtered_df["risk_level"] == "High Risk"])

kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)

with kpi1:
    st.metric(
        label="📁 Total Projects",
        value=total_projects,
        help="Number of active or completed works under scrutiny"
    )

with kpi2:
    st.metric(
        label="💰 Approved Funds",
        value=f"₹{total_approved / 10000000:.2f} Cr",
        help="Total sanctioned allocation for filtered works"
    )

with kpi3:
    st.metric(
        label="💸 Expenditure",
        value=f"₹{total_spent / 10000000:.2f} Cr",
        delta=f"{overall_utilization:.1f}% Utilized",
        delta_color="off",
        help="Total disbursed funds and overall scheme utilization"
    )

with kpi4:
    st.metric(
        label="🚨 AI Anomalies",
        value=anomalies_count,
        delta=f"{(anomalies_count/total_projects*100):.0f}% Flagged" if total_projects > 0 else "0%",
        delta_color="inverse",
        help="Projects flagged by Isolation Forest as statistical outliers"
    )

with kpi5:
    st.metric(
        label="⚠️ High-Risk Works",
        value=high_risk_count,
        delta="Needs Priority Audit" if high_risk_count > 0 else "All Clear",
        delta_color="inverse" if high_risk_count > 0 else "normal",
        help="Works accumulating risk score >= 70 from cost/progress variance"
    )

st.markdown("---")

# =========================================================
# TABS FOR CLEAN GOVERNMENT-STYLE DASHBOARD NAVIGATION
# =========================================================

tab_overview, tab_anomaly, tab_expenditure, tab_delay, tab_details = st.tabs([
    "📊 Overview & Status",
    "🤖 AI Anomaly Analysis",
    "💰 Progress vs Expenditure",
    "⏱️ Delay & District Analytics",
    "🔎 Project Details Inspector"
])

# ---------------------------------------------------------
# TAB 1: OVERVIEW & STATUS
# ---------------------------------------------------------
with tab_overview:
    col_chart1, col_chart2 = st.columns(2)

    with col_chart1:
        st.subheader("📊 Implementation Status Breakdown")
        status_counts = filtered_df["completion_status"].value_counts().reset_index()
        status_counts.columns = ["Status", "Count"]

        color_map = {
            "Ongoing": "#3b82f6",
            "Delayed": "#f59e0b",
            "Completed": "#10b981"
        }

        fig_status = px.pie(
            status_counts,
            names="Status",
            values="Count",
            color="Status",
            color_discrete_map=color_map,
            hole=0.45,
            title="Work Completion Status"
        )
        fig_status.update_traces(textposition='inside', textinfo='percent+label')
        fig_status.update_layout(margin=dict(t=40, b=20, l=20, r=20))
        st.plotly_chart(fig_status, use_container_width=True)

    with col_chart2:
        st.subheader("🚨 Risk Severity Distribution")
        risk_counts = filtered_df["risk_level"].value_counts().reset_index()
        risk_counts.columns = ["Risk Level", "Count"]

        risk_color_map = {
            "Low Risk": "#10b981",
            "Medium Risk": "#f59e0b",
            "High Risk": "#ef4444"
        }

        fig_risk = px.bar(
            risk_counts,
            x="Risk Level",
            y="Count",
            color="Risk Level",
            color_discrete_map=risk_color_map,
            text="Count",
            title="Project Risk Category Distribution"
        )
        fig_risk.update_layout(
            xaxis_title="Assigned Risk Category",
            yaxis_title="Project Count",
            margin=dict(t=40, b=20, l=20, r=20),
            showlegend=False
        )
        st.plotly_chart(fig_risk, use_container_width=True)

    # Approved vs Spent comparison chart
    st.subheader("🏛️ Approved Allocation vs. Actual Expenditure (₹ Lakhs)")
    st.caption("Top filtered development works comparing sanctioned budget versus utilized disbursements.")

    top_projects = filtered_df.copy().head(12)
    top_projects["Approved (Lakhs)"] = (top_projects["approved_amount"] / 100000).round(1)
    top_projects["Spent (Lakhs)"] = (top_projects["spent_amount"] / 100000).round(1)

    fig_comparison = go.Figure()
    fig_comparison.add_trace(go.Bar(
        x=top_projects["project_name"],
        y=top_projects["Approved (Lakhs)"],
        name="Approved (₹ Lakhs)",
        marker_color="#2563eb"
    ))
    fig_comparison.add_trace(go.Bar(
        x=top_projects["project_name"],
        y=top_projects["Spent (Lakhs)"],
        name="Spent (₹ Lakhs)",
        marker_color="#f59e0b"
    ))
    fig_comparison.update_layout(
        barmode="group",
        xaxis_tickangle=-25,
        yaxis_title="Amount (₹ in Lakhs)",
        margin=dict(t=30, b=40, l=20, r=20),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig_comparison, use_container_width=True)

# ---------------------------------------------------------
# TAB 2: AI ANOMALY DETECTION
# ---------------------------------------------------------
with tab_anomaly:
    st.subheader("🤖 Isolation Forest Anomaly Detection Engine")
    st.markdown("""
    The AI model evaluates four simultaneous vectors: **Approved Amount**, **Spent Amount**, 
    **Physical Progress (%)**, and **Project Delay (Days)**. It identifies multi-dimensional outliers where 
    spending velocity significantly outpaces ground-level physical completion.
    """)

    # Anomaly Visualization: Progress vs Utilization with Anomaly Flagging
    fig_scatter = px.scatter(
        filtered_df,
        x="progress_percent",
        y="utilization_percent",
        color="ai_anomaly",
        size="approved_amount",
        hover_name="project_name",
        hover_data={
            "district": True,
            "delay_days": True,
            "risk_level": True,
            "approved_amount": ":,.0f",
            "spent_amount": ":,.0f"
        },
        color_discrete_map={
            "Anomaly Detected": "#ef4444",
            "Normal": "#10b981"
        },
        title="AI Anomaly Map: Physical Progress (%) vs. Fund Utilization (%)",
        labels={
            "progress_percent": "Ground Work Progress (%)",
            "utilization_percent": "Budget Utilization (%)",
            "ai_anomaly": "AI Evaluation"
        }
    )

    # Highlight High Discrepancy Danger Zone (Spend > 80% and Progress < 40%)
    fig_scatter.add_shape(
        type="rect",
        x0=0, x1=40, y0=80, y1=115,
        fillcolor="rgba(239, 68, 68, 0.12)",
        line=dict(color="rgba(239, 68, 68, 0.6)", dash="dash"),
    )
    fig_scatter.add_annotation(
        x=20, y=95,
        text="⚠️ CRITICAL AUDIT ZONE<br>(Spend >80%, Progress <40%)",
        showarrow=False,
        font=dict(color="#b91c1c", size=11, family="sans-serif")
    )
    fig_scatter.update_layout(margin=dict(t=40, b=30, l=20, r=20))
    st.plotly_chart(fig_scatter, use_container_width=True)

    # Table of AI Flagged Anomalies
    st.subheader("🚨 Flagged Anomaly Register")
    anomalies_df = filtered_df[filtered_df["ai_anomaly"] == "Anomaly Detected"]

    if len(anomalies_df) > 0:
        st.warning(f"⚠️ {len(anomalies_df)} project(s) exhibit unusual mathematical divergence.")
        display_cols = [
            "project_id", "project_name", "district", "category",
            "approved_amount", "spent_amount", "progress_percent",
            "delay_days", "risk_level", "risk_reason"
        ]
        st.dataframe(
            anomalies_df[display_cols].rename(columns={
                "project_id": "Work ID",
                "project_name": "Scheme Work Name",
                "district": "District",
                "category": "Sector",
                "approved_amount": "Approved (₹)",
                "spent_amount": "Spent (₹)",
                "progress_percent": "Progress %",
                "delay_days": "Delay (Days)",
                "risk_level": "Risk Tier",
                "risk_reason": "Audit Trigger Rationale"
            }),
            use_container_width=True,
            hide_index=True
        )
    else:
        st.success("✅ No statistical anomalies flagged for currently selected filters.")

# ---------------------------------------------------------
# TAB 3: PROGRESS VS EXPENDITURE ANALYSIS
# ---------------------------------------------------------
with tab_expenditure:
    st.subheader("📈 Project Progress vs. Expenditure Parity Analysis")
    st.markdown("""
    In an ideal execution schedule, **Fund Utilization %** tracks closely with **Physical Progress %** 
    (along the dashed 45° Parity Line). Works far above the line indicate **front-loaded expenditure** 
    with unverified physical outcomes.
    """)

    fig_parity = go.Figure()

    # 45-degree parity reference line
    fig_parity.add_trace(go.Scatter(
        x=[0, 100],
        y=[0, 100],
        mode="lines",
        name="Ideal Parity Line (Spend = Progress)",
        line=dict(color="#94a3b8", dash="dash")
    ))

    # Plot projects colored by risk level
    for risk in ["Low Risk", "Medium Risk", "High Risk"]:
        sub = filtered_df[filtered_df["risk_level"] == risk]
        if not sub.empty:
            fig_parity.add_trace(go.Scatter(
                x=sub["progress_percent"],
                y=sub["utilization_percent"],
                mode="markers+text",
                name=risk,
                text=sub["project_id"],
                textposition="top center",
                marker=dict(
                    size=12,
                    color="#10b981" if risk == "Low Risk" else "#f59e0b" if risk == "Medium Risk" else "#ef4444",
                    line=dict(width=1, color="#1e293b")
                ),
                customdata=sub[["project_name", "district", "delay_days", "spent_amount"]],
                hovertemplate="<b>%{text} - %{customdata[0]}</b><br>" +
                              "District: %{customdata[1]}<br>" +
                              "Progress: %{x}%<br>" +
                              "Spent: %{y}% (₹%{customdata[3]:,})<br>" +
                              "Delay: %{customdata[2]} days<extra></extra>"
            ))

    fig_parity.update_layout(
        xaxis_title="Physical Ground Progress (%)",
        yaxis_title="Fund Utilization (% of Approved)",
        margin=dict(t=30, b=30, l=30, r=30),
        xaxis=dict(range=[0, 105]),
        yaxis=dict(range=[0, 115])
    )
    st.plotly_chart(fig_parity, use_container_width=True)

# ---------------------------------------------------------
# TAB 4: DELAY & DISTRICT ANALYTICS
# ---------------------------------------------------------
with tab_delay:
    st.subheader("⏱️ Project Delay & Regional Variance Analysis")

    col_del1, col_del2 = st.columns(2)

    with col_del1:
        st.markdown("##### Average Project Delay by Category (Days)")
        delay_cat = filtered_df.groupby("category")["delay_days"].mean().reset_index()
        delay_cat = delay_cat.sort_values(by="delay_days", ascending=True)

        fig_del_cat = px.bar(
            delay_cat,
            x="delay_days",
            y="category",
            orientation="h",
            title="Mean Delay (Days) per Work Category",
            labels={"delay_days": "Average Delay Days", "category": "Sector"},
            color="delay_days",
            color_continuous_scale="Reds"
        )
        fig_del_cat.update_layout(margin=dict(t=30, b=20, l=20, r=20), coloraxis_showscale=False)
        st.plotly_chart(fig_del_cat, use_container_width=True)

    with col_del2:
        st.markdown("##### District Expenditure vs. Progress Overview")
        dist_summary = filtered_df.groupby("district").agg({
            "approved_amount": "sum",
            "spent_amount": "sum",
            "progress_percent": "mean",
            "delay_days": "mean"
        }).reset_index()
        dist_summary["utilization_pct"] = (dist_summary["spent_amount"] / dist_summary["approved_amount"] * 100).round(1)
        dist_summary["progress_percent"] = dist_summary["progress_percent"].round(1)

        fig_dist = px.bar(
            dist_summary,
            x="district",
            y=["utilization_pct", "progress_percent"],
            barmode="group",
            title="District-wise Budget Utilization vs. Avg Progress",
            labels={"value": "Percentage (%)", "district": "District", "variable": "Metric"}
        )
        fig_dist.update_layout(margin=dict(t=30, b=20, l=20, r=20))
        st.plotly_chart(fig_dist, use_container_width=True)

# ---------------------------------------------------------
# TAB 5: PROJECT DETAILS INSPECTOR
# ---------------------------------------------------------
with tab_details:
    st.subheader("🔎 Individual Project Deep-Dive & Inspection Dossier")

    if not filtered_df.empty:
        project_names = filtered_df["project_name"].tolist()
        selected_project_name = st.selectbox("Select Project for Comprehensive Audit File:", project_names)

        project = filtered_df[filtered_df["project_name"] == selected_project_name].iloc[0]

        # Project Summary Banner
        p_col1, p_col2, p_col3, p_col4 = st.columns(4)
        with p_col1:
            st.metric("Approved Sanction", f"₹{project['approved_amount']/100000:.2f} Lakhs")
        with p_col2:
            st.metric("Disbursed Spend", f"₹{project['spent_amount']/100000:.2f} Lakhs", f"{project['utilization_percent']}% Utilized")
        with p_col3:
            st.metric("Physical Progress", f"{project['progress_percent']}%")
        with p_col4:
            st.metric("Schedule Delay", f"{project['delay_days']} Days")

        st.markdown("#### Administrative Metadata")
        m_col1, m_col2, m_col3 = st.columns(3)
        with m_col1:
            st.write(f"**Work Code:** `{project['project_id']}`")
            st.write(f"**District:** {project['district']}")
        with m_col2:
            st.write(f"**Category:** {project['category']}")
            st.write(f"**Status:** {project['completion_status']}")
        with m_col3:
            st.write(f"**AI Anomaly:** `{project['ai_anomaly']}`")
            st.write(f"**Risk Level:** **{project['risk_level']}**")

        # Alert Box for Risk
        if project["risk_level"] == "High Risk":
            st.error(
                f"🚨 **HIGH RISK AUDIT ALERT**\n\n"
                f"**Audit Findings:** {project['risk_reason']}\n\n"
                f"**Recommended Vigilance Action:** Dispatch District Inspection Team for ground physical verification "
                f"before authorizing subsequent bill disbursements.",
                icon="🚨"
            )
        elif project["risk_level"] == "Medium Risk":
            st.warning(
                f"⚠️ **MEDIUM RISK NOTIFICATION**\n\n"
                f"**Audit Findings:** {project['risk_reason']}\n\n"
                f"**Recommended Vigilance Action:** Request updated progress photographs and engineering measurement book (MB) entries.",
                icon="⚠️"
            )
        else:
            st.success(
                f"✅ **NORMAL PARAMETERS**\n\n"
                f"**Status:** {project['risk_reason']}\n\n"
                f"Project progress aligns with expenditure milestones.",
                icon="✅"
            )

        # Progress Visual Bars
        st.markdown("##### Progress vs. Expenditure Benchmark")
        st.write("Physical Completion:")
        st.progress(min(int(project["progress_percent"]), 100))
        st.write("Financial Drawdown:")
        st.progress(min(int(project["utilization_percent"]), 100))

    else:
        st.info("No projects match the selected sidebar filters.")

# =========================================================
# FOOTER
# =========================================================

st.markdown("---")
f_col1, f_col2 = st.columns([3, 1])

with f_col1:
    st.caption("🏛️ **MPLADS AI** — Anomaly Detection & Monitoring Prototype for Public Works.")
    st.caption("Disclaimer: AI anomaly detection highlights statistical divergences to assist project auditing officers. It does not constitute legal proof of fraud.")

with f_col2:
    st.caption("Team Nova | Hackathon Edition")
