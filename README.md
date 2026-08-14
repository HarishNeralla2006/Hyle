# Hyle

### Explore knowledge. Discover connections.

Hyle is an interactive knowledge exploration and social platform built around the idea of **Domain Expansion**.

Instead of searching through endless lists of results, Hyle lets you visually explore knowledge as an expanding universe of domains and topics.

Start with a broad field.

Dive deeper.

Discover new concepts.

Find communities and people.

Keep exploring.

---

## 🌐 What is Hyle?

Hyle transforms knowledge discovery into an interactive exploration experience.

A domain can expand into multiple related topics, which can expand into even more specific concepts.

```text
Science
   │
   ├── Physics
   │    ├── Quantum Mechanics
   │    ├── Relativity
   │    ├── Thermodynamics
   │    └── Astrophysics
   │
   ├── Biology
   │    ├── Genetics
   │    ├── Neuroscience
   │    └── Evolution
   │
   └── Chemistry
        ├── Organic Chemistry
        ├── Biochemistry
        └── Physical Chemistry
```

The result is a continuously expanding knowledge space where users can move from broad interests to highly specific topics.

---

## ✨ Core Features

### 🪐 Domain Expansion

Explore knowledge through an interactive visual domain system.

* Interactive domain spheres
* Expandable topics
* Hierarchical exploration
* Deep topic navigation
* Dynamic domain generation
* Breadcrumb navigation
* Zoom and pan interactions
* Responsive layouts
* Collision-aware visual positioning

---

### 🔎 Smart Search

Find concepts and domains without relying on simple keyword matching.

Hyle provides:

* Intelligent search suggestions
* Alias recognition
* Exact-match prioritization
* Prefix-based ranking
* Concept filtering
* Duplicate reduction
* Semantic matching
* Relevant topic discovery

Search naturally:

```text
AI
ML
CS
NLP
LLM
Quantum Computing
Computer Vision
```

and discover the corresponding knowledge domains.

---

### 🧠 Semantic Discovery

Hyle combines traditional matching techniques with semantic understanding to identify related concepts.

This allows the platform to recognize that different expressions can represent the same or closely related idea.

```text
Computer Science
       │
       ├── CS
       ├── Comp Sci
       └── Computing
```

The system can use these relationships when organizing communities and discovering relevant content.

---

### 👥 Communities

Create and discover communities around knowledge domains and interests.

Communities support:

* Community creation
* Community discovery
* Membership
* Member counts
* Descriptions
* Tags
* Topic-based organization
* Related content

---

### 📝 Social Feed

Hyle combines knowledge exploration with social interaction.

Users can:

* Create posts
* View posts
* Like posts
* Comment
* Save domains
* Follow users
* View profiles
* Discover content
* Receive notifications

This creates a simple loop:

```text
Explore
   ↓
Discover
   ↓
Learn
   ↓
Share
   ↓
Connect
   ↓
Explore further
```

---

### 💬 Messaging

Connect with other users through built-in messaging.

Features include:

* One-to-one conversations
* Chat requests
* Conversation management
* Message history
* Inbox
* Participant management

---

### 👤 Profiles

Every user has a profile that brings together their identity and activity.

Profiles can include:

* User information
* Posts
* Followers
* Following
* Communities
* Saved domains
* Social activity

---

### 🔔 Notifications

Hyle provides an in-app notification system for social activity and interactions.

Users can stay aware of:

* Likes
* Comments
* Follows
* Social interactions
* Other account activity

---

## 🧭 How Hyle Works

The core experience can be understood as:

```text
                    HYLE
                      │
                      ▼
                 Choose a Domain
                      │
                      ▼
                Explore Topics
                      │
                      ▼
              Expand the Domain
                      │
                      ▼
              Discover Concepts
                      │
              ┌───────┴────────┐
              ▼                ▼
          Communities        Content
              │                │
              └───────┬────────┘
                      ▼
                    People
                      │
                      ▼
                  Connections
                      │
                      ▼
               More Exploration
```

Hyle is designed around **discovery rather than destination**.

There is no single endpoint to the knowledge graph.

Every topic can become the beginning of another exploration path.

---

## 🏗️ Architecture

```text
                         HYLE
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
     Exploration       Social          Identity
          │               │               │
     Domain System      Posts        Authentication
     Search             Likes
     Discovery          Comments
                        Profiles
                        Follow
                        Chat
          │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                    Service Layer
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
           Search      Semantic     Content
           Services    Services     Services
              │           │           │
              └───────────┼───────────┘
                          │
                          ▼
                     Data Layer
                          │
                  ┌───────┴────────┐
                  ▼                ▼
              Cloud DB        Local Storage
```

---

## 🛠️ Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Three.js**
* **React Three Fiber**
* **React Three Drei**

### Backend & Data

* **TiDB Serverless**
* Next.js server-side functionality
* Local data fallback mechanisms

### Authentication

* **Firebase Authentication**

### Semantic Processing

* **Transformers**
* Vector embeddings
* Cosine similarity

### Deployment

* **Vercel**

---

## 📁 Project Structure

```text
Hyle/
│
├── app/
│   └── actions.ts
│
├── components/
│   ├── AuthView.tsx
│   ├── ChatView.tsx
│   ├── ExploreView.tsx
│   ├── FeedView.tsx
│   ├── InboxView.tsx
│   ├── Navbar.tsx
│   ├── NotificationsView.tsx
│   ├── PostCard.tsx
│   ├── PostView.tsx
│   ├── ProfileView.tsx
│   ├── SearchView.tsx
│   ├── SettingsView.tsx
│   └── ...
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── StatusContext.tsx
│   └── ThemeContext.tsx
│
├── hooks/
│
├── lib/
│   ├── communities.ts
│   ├── firebaseClient.ts
│   ├── imageUtils.ts
│   ├── normalization.ts
│   ├── tidbClient.ts
│   └── vector.ts
│
├── pages/
│   └── index.tsx
│
├── public/
│
├── scripts/
│
├── services/
│   ├── chatService.ts
│   ├── webSearchService.ts
│   └── wikipediaService.ts
│
├── styles/
│
├── types.ts
├── next.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/HarishNeralla2006/Hyle.git
cd Hyle
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

Add the required application configuration and credentials.

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 📜 Available Scripts

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server.

```bash
npm run lint
```

Runs the project's linting process.

---

## 🌍 Deployment

Hyle is designed for modern web deployment and is currently available through Vercel.

**Live application:**

[Hyle Live](https://hyle.vercel.app/)

**Source code:**

[Hyle on GitHub](https://github.com/HarishNeralla2006/Hyle)

---

## 🔮 Vision

Most knowledge platforms are built around search.

Hyle is built around **exploration**.

Traditional model:

```text
Question
   ↓
Search
   ↓
Result
```

Hyle model:

```text
Interest
   ↓
Domain
   ↓
Topic
   ↓
Subtopic
   ↓
Community
   ↓
Content
   ↓
People
   ↓
New Interest
   ↓
Another Domain
```

The goal is to create a platform where discovering something interesting naturally leads to discovering something else.

---

## 🗺️ Roadmap

* [ ] Personalized knowledge discovery
* [ ] User interest graph
* [ ] Personalized domain recommendations
* [ ] Advanced semantic search
* [ ] Knowledge graph visualization
* [ ] Improved community discovery
* [ ] Rich media content
* [ ] Real-time messaging improvements
* [ ] Community moderation
* [ ] Advanced recommendation system
* [ ] Offline-first improvements
* [ ] Expanded mobile experience
* [ ] Automated testing
* [ ] Production observability

---

## 📊 Project Status

Hyle is an actively developed project focused on combining **knowledge exploration, intelligent discovery, and social interaction** into one experience.

Current capabilities include:

* Interactive domain exploration
* Dynamic topic expansion
* Smart search
* Semantic discovery
* Communities
* Posts
* Comments
* Likes
* Saved domains
* Profiles
* Following
* Notifications
* Messaging
* Authentication
* Responsive UI
* Web deployment

---

## 👨‍💻 Author

### Harish Neralla

Computer Science & Engineering

[GitHub]https://github.com/HarishNeralla2006/

---

## ⭐ Hyle

> **Don't just search for knowledge. Explore it.**
