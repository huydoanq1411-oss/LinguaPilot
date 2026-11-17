import { useEffect, useRef, useState } from 'react'
import './App.css'
import { lessonDestination } from './lesson-navigation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
// Chỉ lưu token; thông tin user được xác minh lại qua /auth/me khi tải trang.
const TOKEN_KEY = 'linguapilot_token'
let memoryToken
function storedToken() {
  if (memoryToken !== undefined) return memoryToken
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
const lessons = [
  { icon: 'あ', title: 'Bảng chữ cái', detail: 'Hiragana, Katakana và Kanji', href: '/jp/bang-chu-cai.html', tone: 'pink' },
  { icon: '文', title: 'Lộ trình học', detail: '10 phần từ nền tảng đến N1', href: '/jp/phan01.html', tone: 'blue' },
  { icon: '試', title: 'Luyện thi JLPT', detail: 'Bài kiểm tra N5 đến N1', href: '/jp/test-n5.html', tone: 'yellow' },
  { icon: '漢', title: 'Tra cứu Kanji', detail: 'Tìm chữ và cách đọc', href: '/jp/tra-kanji.html', tone: 'green' },
]

async function api(path, options = {}) {
  const token = storedToken()
  // Header Authorization chỉ được gửi khi đã có token trong trình duyệt.
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(15000),
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'Không thể kết nối máy chủ. Vui lòng thử lại.')
    error.status = response.status
    throw error
  }
  return data
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [sessionNotice, setSessionNotice] = useState('')
  const sessionVersion = useRef(0)

  useEffect(() => {
    let active = true
    async function checkConnection() {
      const version = sessionVersion.current
      api('/health').then(() => { if (active) setApiStatus('up') }).catch(() => { if (active) setApiStatus('down') })
      if (!storedToken()) return
      try {
        const account = await api('/auth/me')
        if (active && version === sessionVersion.current) { setUser(account); setSessionNotice('') }
      } catch (err) {
        if (!active || version !== sessionVersion.current) return
        if (err.status === 401) {
          memoryToken = null
          try { localStorage.removeItem(TOKEN_KEY) } catch { /* Storage may be blocked. */ }
          setUser(null)
          setSessionNotice('Phiên đã hết hạn. Vui lòng đăng nhập lại.')
        } else {
          setSessionNotice('Chưa xác minh được phiên. Vui lòng kiểm tra kết nối và thử lại để mở bài học.')
        }
      }
    }
    checkConnection()
    window.addEventListener('online', checkConnection)
    return () => { active = false; window.removeEventListener('online', checkConnection) }
  }, [])

  useEffect(() => {
    window.bindLinguaPilotInstallButton?.(document.getElementById('installAppButton'))
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const version = ++sessionVersion.current
    try {
      const result = await api(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (version !== sessionVersion.current) return
      memoryToken = result.token
      try {
        localStorage.setItem(TOKEN_KEY, result.token)
        setSessionNotice('')
      } catch {
        setSessionNotice('Trình duyệt không lưu được phiên. Vui lòng cho phép lưu dữ liệu website rồi đăng nhập lại để mở bài học.')
        memoryToken = null
        return
      }
      setUser(result.user)
      window.location.assign(lessonDestination(window.location.search))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    sessionVersion.current++
    memoryToken = null
    try {
      localStorage.removeItem(TOKEN_KEY)
      setSessionNotice('')
    } catch {
      setSessionNotice('Không xóa được phiên đã lưu. Hãy xóa dữ liệu website trong cài đặt trình duyệt trước khi dùng chung thiết bị.')
    }
    setUser(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="LinguaPilot trang chủ">
          <img className="brand-app-icon" src="/app-icon.svg" alt="" /><span>lingua<span className="brand-light">pilot</span></span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="/jp/index.html">Khám phá</a>
          <a href="/jp/cau-truc-jlpt.html">Kỳ thi JLPT</a>
        </nav>
        <button id="installAppButton" className="install-app-button" type="button" aria-label="Thêm LinguaPilot vào màn hình chính" title="Thêm LinguaPilot vào màn hình chính" hidden>＋ Cài app</button>
        {user ? <div className="account"><span className="avatar">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span><span className="account-name">{user.displayName || user.email}</span><button className="text-button" onClick={signOut}>Đăng xuất</button></div> : <a className="nav-cta" href="#account">Bắt đầu học <span>↗</span></a>}
      </header>

      <main id="home">
        {sessionNotice && <p className="form-error" role="status">{sessionNotice}</p>}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> KHÔNG GIAN HỌC NGOẠI NGỮ CỦA BẠN</div>
            <h1>Học ngôn ngữ,<br /><span>mở lối tương lai.</span></h1>
            <p className="hero-description">Từng bước vững chắc trên hành trình chinh phục tiếng Nhật. Bài học, công cụ tra cứu và luyện thi JLPT luôn ở ngay đây.</p>
            <div className="hero-actions"><a className="primary-button" href="/jp/index.html">Khám phá bài học <span>→</span></a><a className="secondary-link" href="/jp/kiem-tra-thang-cap.html">Kiểm tra trình độ <span>↗</span></a></div>
            <div className="hero-note"><div className="mini-avatars"><span>あ</span><span>日</span><span>語</span></div><span>Học theo nhịp độ của riêng bạn</span></div>
          </div>
          <div className="hero-art" aria-label="Minh họa học tiếng Nhật" role="img">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-sun" />
            <div className="art-card card-back"><span>日本語</span><small>mỗi ngày một chút</small></div>
            <div className="art-card card-front"><div className="card-label">TỪ VỰNG HÔM NAY <span>✦</span></div><div className="kanji">夢</div><div className="reading">ゆめ · yume</div><div className="meaning">giấc mơ</div><div className="card-progress"><span /></div><div className="card-footer"><span>01 / 12</span><span>Đang học</span></div></div>
            <div className="float-tag tag-top">今日も一歩 <span>✦</span></div><div className="float-tag tag-bottom"><span className="tag-dot" /> Hành trình N5 → N1</div>
            <span className="spark spark-one">✳</span><span className="spark spark-two">✦</span>
          </div>
        </section>

        <section className="stats-strip" aria-label="Thông tin nền tảng"><div><strong>10<span>+</span></strong><small>PHẦN HỌC CÓ LỘ TRÌNH</small></div><div><strong>5</strong><small>CẤP ĐỘ JLPT</small></div><div><strong>∞</strong><small>LUÔN SẴN SÀNG ĐỂ ÔN TẬP</small></div><div className="stats-caption">Bắt đầu từ những điều nhỏ,<br />tiến xa theo cách của bạn.</div></section>

        <section className="learning-section" id="learning">
          <div className="section-heading"><div><div className="eyebrow">CHỌN ĐIỀU BẠN MUỐN HỌC</div><h2>Mỗi ngày tiến thêm<br />một bước nhỏ.</h2></div><a href="/jp/index.html" className="all-lessons">Tất cả nội dung <span>↗</span></a></div>
          <div className="lesson-grid">{lessons.map((lesson, index) => <a className="lesson-card" href={lesson.href} key={lesson.title}><div className={`lesson-icon ${lesson.tone}`}>{lesson.icon}</div><div className="lesson-index">0{index + 1} <span>↗</span></div><h3>{lesson.title}</h3><p>{lesson.detail}</p><div className="lesson-bottom"><span>Khám phá</span><span className="lesson-arrow">→</span></div></a>)}</div>
        </section>

        <section className="account-section" id="account"><div className="account-intro"><div className="eyebrow">TÀI KHOẢN LINGUAPILOT</div><h2>{user ? `Chào mừng trở lại${user.displayName ? `, ${user.displayName}` : ''}!` : 'Học theo nhịp độ của bạn.'}</h2><p>Tiến độ hiện lưu trên trình duyệt này, chưa đồng bộ với tài khoản hoặc thiết bị khác.</p><div className={`service-status ${apiStatus}`}><span />{apiStatus === 'up' ? 'Máy chủ đang hoạt động' : apiStatus === 'down' ? 'Máy chủ chưa kết nối' : 'Đang kiểm tra máy chủ'}</div></div>
          {user ? <div className="signed-in-card"><div className="signed-icon">✓</div><h3>Bạn đã đăng nhập</h3><p>{user.email}</p><span>Hãy chọn một mục học phía trên để tiếp tục.</span></div> : <form className="auth-card" onSubmit={submit}>
            <div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError('') }}>Đăng nhập</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setError('') }}>Tạo tài khoản</button></div>
            {authMode === 'register' && <label>Tên hiển thị<input autoComplete="name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Tên của bạn" maxLength="60" /></label>}
            <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ban@email.com" /></label>
            <label>Mật khẩu<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 8 ký tự" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <span>→</span></button>
            <p className="privacy-note">Đăng nhập để mở bài học. Tiến độ học vẫn lưu riêng trên trình duyệt này.</p>
          </form>}
        </section>
      </main>
      <footer className="footer"><a className="brand" href="#home"><img className="brand-app-icon" src="/app-icon.svg" alt="" /><span>lingua<span className="brand-light">pilot</span></span></a><span>Học một chút mỗi ngày, tiến xa hơn mỗi chặng đường.</span><a href="/jp/index.html">Thư viện tiếng Nhật ↗</a></footer>
    </div>
  )
}

export default App
