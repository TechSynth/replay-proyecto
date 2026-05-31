# rePLAY 🎧
### *Cloud-Native Music Streaming Platform*

rePLAY is a single Page Application personal music management. Developed as a Final Degree Project (TFG) for the C.F.G.S in Web Application Development (DAW II), it demonstrates the seamless integration of modern web technologies with professional-grade AWS cloud infrastructure.

**Live Project:** [https://replays.studio](https://replays.studio)

---

## 🏗 System Architecture
rePLAY utilizes a **decoupled, three-tier architecture** to ensure maximum performance and scalability:

1.  **Presentation Layer (Frontend)**: A responsive SPA built with Vanilla JavaScript (ES6+), optimized for seamless transitions and real-time DOM manipulation.
2.  **Logic Layer (Backend API)**: A robust Node.js and Express.js server managing business logic, secure authentication, and cloud orchestration.
3.  **Data & Storage Layer**:
    *   **Metadata**: Managed via **Amazon RDS (MySQL)** for structured data integrity.
    *   **Media Assets**: High-fidelity audio and imagery are served directly via **Amazon S3**, offloading heavy traffic from the main server.

---

## ✨ Key Features

### 🎵 Premium Playback Experience
*   **Hero Transitions**: Symmetrical shared-element animations for a fluid mobile experience.
*   **Neomorphic Design**: A modern "Dark Mode" aesthetic using shadows and highlights for a tactile feel.
*   **Real-time Progress**: Highly accurate synchronization between the audio engine and visual indicators.

### 📁 Smart Media Management
*   **Automated Metadata Extraction**: Automatic parsing of ID3 tags (Title, Artist, Album Art) during MP3 uploads.
*   **Cloud-First Storage**: Direct integration with AWS S3 for ultra-fast media streaming.
*   **Intuitive Playlists**: Drag & Drop organization on desktop and Bottom-Sheet menus on mobile.

### 🛡 Security & User Control
*   **OAuth 2.0 Integration**: Secure login with **Google Authentication**.
*   **JWT Sessions**: Stateless authentication for improved performance and security.
*   **Atomic Deletion**: Secure account removal with automatic cleanup of all associated S3 files and RDS records.

---

## 🛠 Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Language** | JavaScript (ES6+) | Unified full-stack development |
| **Frontend** | HTML5, CSS3 (Grid/Flex) | Responsive & Interactive UI |
| **Backend** | Node.js / Express | API REST & Business Logic |
| **Database** | MySQL (Amazon RDS) | Persistent Data Storage |
| **Cloud** | Amazon S3 | Binary Object Storage (Audio/Images) |
| **Server** | Amazon EC2 (Ubuntu 24.04) | Production Hosting |
| **Proxy** | Nginx | Reverse Proxy & SSL termination |

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20 or higher)
*   MySQL 8.0
*   AWS Account (S3, RDS, EC2)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/TechSynth/replay-proyecto.git
    cd replay-proyecto
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure environment:**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    DB_HOST=your-rds-endpoint.aws.com
    DB_USER=admin
    DB_PASS=your-password
    DB_NAME=replay_db
    AWS_ACCESS_KEY_ID=your-key
    AWS_SECRET_ACCESS_KEY=your-secret
    AWS_REGION=us-east-1
    S3_BUCKET_NAME=replay-music-tfg
    JWT_SECRET=your-secure-secret
    GOOGLE_CLIENT_ID=your-google-id
    ```
4.  **Initialize Database:**
    ```bash
    mysql -u root -p < database.sql
    ```
5.  **Start Production Server:**
    ```bash
    pm2 start server.js --name "rePLAY"
    ```

---

## 🎓 Academic Information
This project represents the cumulative work for the **C.F.G.S Development of Web Applications (DAW II)**.

*   **Focus Areas:** Cloud Computing (AWS), RESTful API Design, Responsive UX/UI.

---
*Developed with ❤️💧🩸 in 2026.*
