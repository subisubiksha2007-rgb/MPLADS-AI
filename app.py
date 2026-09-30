import streamlit as st
import pandas as pd
import plotly.express as px
from sklearn.ensemble import IsolationForest

# =========================================================
# PAGE CONFIGURATION
# =========================================================

st.set_page_config(
    page_title="MPLADS AI",
    page_icon="🤖",
    layout="wide"
)

# =========================================================
# LOAD DATA
# =========================================================

df = pd.read_csv("data.csv")

# =========================================================
# BASIC CALCULATIONS
# =========================================================

df["utilization_percent"] = (
    df["spent_amount"] / df["approved_amount"] * 100
).round(1)

# =========================================================
# AI ANOMALY DETECTION
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

# =========================================================
# RISK LEVEL
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
# RISK REASON
# =========================================================

def get_reason(row):

    reasons = []

    if row["utilization_percent"] > 80 and row["progress_percent"] < 40:
        reasons.append(
            "High expenditure compared with work progress"
        )

    if row["delay_days"] > 60:
        reasons.append(
            "Significant project delay"
        )

    elif row["delay_days"] > 30:
        reasons.append(
            "Project delay requires monitoring"
        )

    if row["progress_percent"] < 30:
        reasons.append(
            "Very low work progress"
        )

    if row["ai_anomaly"] == "Anomaly Detected":
        reasons.append(
            "AI detected an unusual pattern"
        )

    if not reasons:
        return "No major anomaly detected"

    return " | ".join(reasons)


df["risk_reason"] = df.apply(get_reason, axis=1)

# =========================================================
# SIDEBAR
# =========================================================

st.sidebar.title("🤖 MPLADS AI")

st.sidebar.caption(
    "Fraud & Anomaly Detection System"
)

st.sidebar.markdown("---")

st.sidebar.subheader("🔎 Filters")

districts = [
    "All"
] + sorted(
    df["district"].unique().tolist()
)

categories = [
    "All"
] + sorted(
    df["category"].unique().tolist()
)

risk_levels = [
    "All",
    "Low Risk",
    "Medium Risk",
    "High Risk"
]

selected_district = st.sidebar.selectbox(
    "District",
    districts
)

selected_category = st.sidebar.selectbox(
    "Category",
    categories
)

selected_risk = st.sidebar.selectbox(
    "Risk Level",
    risk_levels
)

# =========================================================
# FILTER DATA
# =========================================================

filtered_df = df.copy()

if selected_district != "All":

    filtered_df = filtered_df[
        filtered_df["district"] == selected_district
    ]

if selected_category != "All":

    filtered_df = filtered_df[
        filtered_df["category"] == selected_category
    ]

if selected_risk != "All":

    filtered_df = filtered_df[
        filtered_df["risk_level"] == selected_risk
    ]

# =========================================================
# MAIN HEADER
# =========================================================

st.title("🤖 MPLADS AI")

st.subheader(
    "Fraud & Anomaly Detection Dashboard "
    "for MPLADS Scheme Implementation"
)

st.success(
    "🟢 System Status: Monitoring Active"
)

st.markdown("---")

# =========================================================
# KPI CARDS
# =========================================================

total_projects = len(filtered_df)

total_approved = filtered_df[
    "approved_amount"
].sum()

total_spent = filtered_df[
    "spent_amount"
].sum()

high_risk = len(
    filtered_df[
        filtered_df["risk_level"] == "High Risk"
    ]
)

anomalies = len(
    filtered_df[
        filtered_df["ai_anomaly"] == "Anomaly Detected"
    ]
)

col1, col2, col3, col4 = st.columns(4)

with col1:

    st.metric(
        "📁 Total Projects",
        total_projects
    )

with col2:

    st.metric(
        "💰 Approved Funds",
        f"₹{total_approved / 10000000:.2f} Cr"
    )

with col3:

    st.metric(
        "💸 Total Expenditure",
        f"₹{total_spent / 10000000:.2f} Cr"
    )

with col4:

    st.metric(
        "🚨 AI Anomalies",
        anomalies
    )

st.markdown("---")

# =========================================================
# PROJECT STATUS + RISK CHART
# =========================================================

col1, col2 = st.columns(2)

# PROJECT STATUS

with col1:

    status_data = (
        filtered_df[
            "completion_status"
        ]
        .value_counts()
        .reset_index()
    )

    status_data.columns = [
        "Status",
        "Count"
    ]

    fig_status = px.pie(
        status_data,
        names="Status",
        values="Count",
        title="📊 Project Status"
    )

    st.plotly_chart(
        fig_status,
        use_container_width=True
    )

# RISK DISTRIBUTION

with col2:

    risk_data = (
        filtered_df[
            "risk_level"
        ]
        .value_counts()
        .reset_index()
    )

    risk_data.columns = [
        "Risk Level",
        "Count"
    ]

    fig_risk = px.bar(
        risk_data,
        x="Risk Level",
        y="Count",
        title="🚨 Risk Distribution",
        text="Count"
    )

    st.plotly_chart(
        fig_risk,
        use_container_width=True
    )

# =========================================================
# FUND UTILIZATION
# =========================================================

st.subheader("💰 Fund Utilization")

fund_data = filtered_df[
    [
        "project_name",
        "approved_amount",
        "spent_amount"
    ]
].copy()

fund_data["Approved"] = (
    fund_data["approved_amount"] / 100000
)

fund_data["Spent"] = (
    fund_data["spent_amount"] / 100000
)

fund_data = fund_data.head(10)

fig_fund = px.bar(
    fund_data,
    x="project_name",
    y=[
        "Approved",
        "Spent"
    ],
    title="Approved vs Spent Amount (₹ Lakhs)",
    barmode="group"
)

st.plotly_chart(
    fig_fund,
    use_container_width=True
)

# =========================================================
# AI ANOMALY SECTION
# =========================================================

st.markdown("---")

st.subheader(
    "🤖 AI Anomaly Detection"
)

ai_anomalies = filtered_df[
    filtered_df["ai_anomaly"] == "Anomaly Detected"
]

if len(ai_anomalies) > 0:

    st.warning(
        f"⚠️ AI detected {len(ai_anomalies)} "
        "unusual project patterns."
    )

    st.dataframe(
        ai_anomalies[
            [
                "project_id",
                "project_name",
                "district",
                "approved_amount",
                "spent_amount",
                "progress_percent",
                "delay_days",
                "risk_level",
                "risk_reason"
            ]
        ],
        use_container_width=True,
        hide_index=True
    )

else:

    st.success(
        "✅ No unusual patterns detected."
    )

# =========================================================
# HIGH RISK PROJECTS
# =========================================================

st.markdown("---")

st.subheader(
    "🚨 High-Risk Projects"
)

high_risk_df = filtered_df[
    filtered_df["risk_level"] == "High Risk"
]

if len(high_risk_df) > 0:

    st.dataframe(
        high_risk_df[
            [
                "project_id",
                "project_name",
                "district",
                "approved_amount",
                "spent_amount",
                "progress_percent",
                "delay_days",
                "risk_level",
                "risk_reason"
            ]
        ],
        use_container_width=True,
        hide_index=True
    )

else:

    st.info(
        "No high-risk projects found."
    )

# =========================================================
# PROJECT DETAILS
# =========================================================

st.markdown("---")

st.subheader(
    "🔎 Project Details"
)

project_names = (
    filtered_df[
        "project_name"
    ].tolist()
)

if len(project_names) > 0:

    selected_project = st.selectbox(
        "Select a Project",
        project_names
    )

    project = filtered_df[
        filtered_df["project_name"]
        == selected_project
    ].iloc[0]

    col1, col2, col3, col4 = st.columns(4)

    with col1:

        st.metric(
            "Approved",
            f"₹{project['approved_amount']/100000:.1f} L"
        )

    with col2:

        st.metric(
            "Spent",
            f"₹{project['spent_amount']/100000:.1f} L"
        )

    with col3:

        st.metric(
            "Progress",
            f"{project['progress_percent']}%"
        )

    with col4:

        st.metric(
            "Delay",
            f"{project['delay_days']} days"
        )

    st.write(
        f"**District:** {project['district']}"
    )

    st.write(
        f"**Category:** {project['category']}"
    )

    st.write(
        f"**Completion Status:** "
        f"{project['completion_status']}"
    )

    st.write(
        f"**AI Detection:** "
        f"{project['ai_anomaly']}"
    )

    # Risk message

    if project["risk_level"] == "High Risk":

        st.error(
            f"🔴 HIGH RISK\n\n"
            f"{project['risk_reason']}"
        )

    elif project["risk_level"] == "Medium Risk":

        st.warning(
            f"🟡 MEDIUM RISK\n\n"
            f"{project['risk_reason']}"
        )

    else:

        st.success(
            f"🟢 LOW RISK\n\n"
            f"{project['risk_reason']}"
        )

# =========================================================
# FOOTER
# =========================================================

st.markdown("---")

st.caption(
    "MPLADS AI | TEAM NOVA | Hackathon Prototype"
)

st.caption(
    "AI anomaly detection flags unusual patterns "
    "for further investigation. It does not "
    "automatically declare fraud."
)