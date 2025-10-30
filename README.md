# 🎥 Stream Hub - Multi-Channel Video Streaming Platform

A modern, feature-rich video streaming platform that allows you to stream to multiple platforms simultaneously with scheduling, file management, and real-time monitoring.

## ✨ Key Features

### 🔐 User Management
- **JWT Authentication** - Secure login/register system
- **User Profiles** - Change password, user isolation
- **Multi-user Support** - Each user has isolated file storage

### 📺 Channel Management
- **Multi-Platform Support** - YouTube, Twitch, Facebook, custom RTMP
- **Channel CRUD** - Add, edit, delete streaming channels
- **Real-time Status** - Live channel status monitoring

### 📁 File Management
- **File Upload** - Drag & drop video file uploads
- **File Organization** - User-specific file directories
- **Playlist Support** - Stream multiple files in sequence
- **File Operations** - Download, delete, rename files

### 🎬 Streaming Engine
- **FFmpeg Integration** - Professional streaming with optimal settings
- **Dual Stream Modes** - Per-channel or Tee mode streaming
- **Real-time Logs** - Monitor FFmpeg output via WebSocket
- **Stream Persistence** - Maintain stream state across navigation

### ⏰ Advanced Scheduling
- **Schedule Manager** - Plan streams for future execution
- **Auto-execution** - Automatic stream start at scheduled time
- **Schedule Management** - Edit, delete, monitor scheduled streams
- **Status Tracking** - Real-time schedule status updates

### 🎨 Modern UI/UX
- **Glass Morphism Design** - Modern, elegant interface
- **Professional Icons** - Lucide Vue icons throughout
- **Responsive Layout** - Works on desktop and mobile
- **Real-time Updates** - Auto-refresh every 30 seconds
- **Dark Theme** - Eye-friendly dark interface

## 🚀 Quick Start

### Development Mode (Hot Reload)
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### Production Mode
```bash
# Start production environment
docker-compose up -d

# Stop production environment
docker-compose down
```

## 🌐 Access URLs

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3001
- **Database:** localhost:54328

## 🔧 Development Features

### Hot Reload
- **Backend:** Uses `nodemon` - changes to `.js` files auto-restart server
- **Frontend:** Uses `vite dev server` - changes to `.vue` files auto-reload browser

### File Changes
When you edit files in:
- `./backend/` - Backend auto-restarts
- `./frontend/src/` - Frontend auto-reloads
- No need to rebuild containers!

## 📁 Project Structure

```
stream-webui/
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── ffmpegManager.js  # FFmpeg process management
│   │   └── scheduler.js      # Cron-based scheduling
│   ├── uploads/              # User file storage
│   └── server.js            # Main server file
├── frontend/                 # Vue.js + Vite SPA
│   ├── src/
│   │   ├── components/      # Vue components
│   │   ├── stores/          # Global state management
│   │   └── App.vue         # Main app component
│   └── package.json        # Frontend dependencies
├── db/                      # PostgreSQL setup
│   └── init.sql            # Database schema
├── docker-compose.yml       # Production setup
├── docker-compose.dev.yml   # Development setup
└── .env                    # Environment variables
```

## 🛠️ Environment Variables

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Key variables:
- `BACKEND_PORT=3001` (avoid port 5000 - used by macOS AirPlay)
- `VITE_BACKEND_URL=http://localhost:3001`
- `JWT_SECRET` - Change for production
- `STREAM_SECRET` - Change for production
- `DB_PASSWORD` - PostgreSQL password

## 🎯 Complete Feature List

### Authentication & Users
- ✅ **JWT Authentication** - Secure login/register
- ✅ **User Profiles** - Change password functionality
- ✅ **User Isolation** - Separate file storage per user
- ✅ **Session Management** - Persistent login state

### Channel Management
- ✅ **Multi-Platform Support** - YouTube, Twitch, Facebook, Custom RTMP
- ✅ **Channel CRUD** - Add, edit, delete channels
- ✅ **Real-time Status** - Live monitoring of channel states
- ✅ **Channel Validation** - RTMP URL validation

### File Management
- ✅ **File Upload** - Drag & drop with progress tracking
- ✅ **File Browser** - View, download, delete files
- ✅ **Playlist Creation** - Multi-file streaming sequences
- ✅ **File Metadata** - Size, type, upload date tracking
- ✅ **User Isolation** - Files stored in user-specific directories

### Streaming Engine
- ✅ **FFmpeg Integration** - Professional streaming quality
- ✅ **Dual Stream Modes** - Per-channel vs Tee mode
- ✅ **Real-time Logs** - WebSocket-based FFmpeg monitoring
- ✅ **Stream Persistence** - State maintained across page navigation
- ✅ **Optimal Settings** - 1000k video, 128k audio bitrates
- ✅ **Process Management** - Proper cleanup and error handling

### Advanced Scheduling
- ✅ **Schedule Creation** - Plan future streams
- ✅ **Auto-execution** - Cron-based automatic stream start
- ✅ **Schedule Management** - Edit, delete, monitor schedules
- ✅ **Status Tracking** - Pending, running, completed, failed states
- ✅ **Multi-file Scheduling** - Schedule playlist streams
- ✅ **Channel Selection** - Choose specific channels for scheduled streams

### UI/UX Features
- ✅ **Modern Design** - Glass morphism with gradient backgrounds
- ✅ **Professional Icons** - Lucide Vue icon system
- ✅ **Responsive Layout** - Mobile and desktop optimized
- ✅ **Real-time Updates** - Auto-refresh every 30 seconds
- ✅ **Loading States** - Visual feedback for all operations
- ✅ **Modal System** - Confirmation dialogs with Teleport
- ✅ **Status Indicators** - Color-coded status badges
- ✅ **Progress Tracking** - Upload and operation progress bars

## 🔄 Development Workflow

1. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Make changes to code** - Files auto-reload

3. **View logs if needed:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f frontend
   docker-compose -f docker-compose.dev.yml logs -f backend
   ```

4. **Stop when done:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

## 💻 Usage Guide

### Getting Started
1. **Register/Login** - Create account or login
2. **Add Channels** - Configure your streaming platforms
3. **Upload Files** - Add video files to stream
4. **Start Streaming** - Choose files and channels, then stream
5. **Schedule Streams** - Plan future streams with the scheduler

### Stream Modes
- **Per Channel Mode** - Separate FFmpeg process for each channel (more stable)
- **Tee Mode** - Single FFmpeg process to all channels (more efficient)

### File Management
- **Upload** - Drag & drop video files
- **Playlist** - Select multiple files for sequential streaming
- **Download** - Download your uploaded files
- **Delete** - Remove files you no longer need

### Scheduling
- **Create Schedule** - Select files, channels, and time
- **Auto-execution** - Streams start automatically at scheduled time
- **Management** - Edit or delete pending schedules
- **Monitoring** - Track schedule status in real-time

## 🔍 Technical Details

### Architecture
- **Frontend:** Vue.js 3 + Vite + Lucide Icons
- **Backend:** Node.js + Express + JWT
- **Database:** PostgreSQL with user isolation
- **Streaming:** FFmpeg with optimized settings
- **Scheduling:** Node-cron for automated execution
- **Real-time:** WebSocket for live updates

### FFmpeg Configuration
- **Video:** 1000k bitrate, H.264 codec
- **Audio:** 128k bitrate, AAC codec
- **Real-time:** Low latency streaming parameters
- **Concat:** Playlist support using concat demuxer

### Database Schema
- **users** - User accounts and authentication
- **channels** - Streaming platform configurations
- **active_streams** - Current streaming sessions
- **schedules** - Scheduled stream information

### Security Features
- **JWT Authentication** - Secure token-based auth
- **User Isolation** - Separate file storage per user
- **Input Validation** - Sanitized user inputs
- **CORS Protection** - Cross-origin request security

## 🚨 Troubleshooting

### Port 5000 Conflict (macOS)
If you get "port already in use" error, it's likely macOS AirPlay Receiver:
- **Solution:** Use port 3001 (already configured)
- **Alternative:** Disable AirPlay Receiver in System Preferences > Sharing

### Frontend Not Loading
- Check if `VITE_BACKEND_URL` matches your backend port
- Ensure both containers are running: `docker-compose -f docker-compose.dev.yml ps`

### Database Connection Issues
- Wait a few seconds for PostgreSQL to start
- Check logs: `docker-compose -f docker-compose.dev.yml logs db`

### Stream Not Starting
- Verify RTMP URLs are correct
- Check FFmpeg logs in the stream controller
- Ensure video files are in supported formats
- Confirm channels are properly configured

### File Upload Issues
- Check available disk space
- Verify file formats are supported
- Ensure user has proper permissions
- Check backend logs for detailed errors

## 📦 Production Deployment

### Local Production
```bash
# Build and start production containers
docker-compose up -d --build

# View production logs
docker-compose logs -f
```

### Cloud Deployment Options

#### Railway (Recommended for Single User)
- **Free Tier:** $5/month credit
- **Features:** Docker support, PostgreSQL, auto-deploy
- **Setup:** Connect GitHub repo, configure environment variables

#### DigitalOcean App Platform
- **Free Tier:** $200 credit for new accounts
- **Features:** Docker support, managed database
- **Setup:** Deploy from GitHub with app spec

#### Render
- **Free Tier:** Limited but functional
- **Features:** Auto-deploy, PostgreSQL addon
- **Limitations:** Sleeps after 15min inactivity

### Production Differences
- Optimized builds with multi-stage Docker
- No hot reload for better performance
- Environment-specific configurations
- Production-grade error handling
- Nginx reverse proxy (if needed)

### Resource Requirements
- **CPU:** 1-2 cores (streaming is CPU intensive)
- **RAM:** 2-4GB (depends on concurrent streams)
- **Storage:** 10GB+ (for uploaded video files)
- **Network:** Good upload bandwidth for streaming

## 📝 License

MIT License - Feel free to use and modify for your needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Create an issue with detailed information

---

**Built with ❤️ using Vue.js, Node.js, and FFmpeg**