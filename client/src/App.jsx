import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const TOKEN_KEY = 'linguapilot_token'
const lessons = [
  { icon: 'あ', title: 'Bảng chữ cái', detail: 'Hiragana, Katakana và Kanji', href: '/jp/bang-chu-cai.html', tone: 'pink' },
  { icon: '文', title: 'Lộ trình học', detail: '10 phần từ nền tảng đến N1', href: '/jp/phan01.html', tone: 'blue' },
  { icon: '試', title: 'Luyện thi JLPT', detail: 'Bài kiểm tra N5 đến N1', href: '/jp/test-n5.html', tone: 'yellow' },
  { icon: '漢', title: 'Tra cứu Kanji', detail: 'Tìm chữ và cách đọc', href: '/jp/tra-kanji.html', tone: 'green' },
]

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối máy chủ. Vui lòng thử lại.')
  return data
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    api('/health').then(() => setApiStatus('up')).catch(() => setApiStatus('down'))
    if (localStorage.getItem(TOKEN_KEY)) {
      api('/auth/me').then(setUser).catch(() => localStorage.removeItem(TOKEN_KEY))
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      localStorage.setItem(TOKEN_KEY, result.token)
      setUser(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="LinguaPilot trang chủ">
          <span className="brand-mark">L</span><span>lingua<span className="brand-light">pilot</span></span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="/jp/index.html">Khám phá</a>
          <a href="/jp/cau-truc-jlpt.html">Kỳ thi JLPT</a>
        </nav>
        {user ? <div className="account"><span className="avatar">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span><span className="account-name">{user.displayName || user.email}</span><button className="text-button" onClick={signOut}>Đăng xuất</button></div> : <a className="nav-cta" href="#account">Bắt đầu học <span>↗</span></a>}
      </header>

      <main id="home">
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

        <section className="account-section" id="account"><div className="account-intro"><div className="eyebrow">TÀI KHOẢN LINGUAPILOT</div><h2>{user ? `Chào mừng trở lại${user.displayName ? `, ${user.displayName}` : ''}!` : 'Lưu lại hành trình học của bạn.'}</h2><p>Tạo tài khoản để sẵn sàng đồng bộ tiến độ học tập và quay lại bất cứ lúc nào.</p><div className={`service-status ${apiStatus}`}><span />{apiStatus === 'up' ? 'Máy chủ đang hoạt động' : apiStatus === 'down' ? 'Máy chủ chưa kết nối' : 'Đang kiểm tra máy chủ'}</div></div>
          {user ? <div className="signed-in-card"><div className="signed-icon">✓</div><h3>Bạn đã đăng nhập</h3><p>{user.email}</p><span>Hãy chọn một mục học phía trên để tiếp tục.</span></div> : <form className="auth-card" onSubmit={submit}>
            <div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError('') }}>Đăng nhập</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setError('') }}>Tạo tài khoản</button></div>
            {authMode === 'register' && <label>Tên hiển thị<input autoComplete="name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Tên của bạn" maxLength="60" /></label>}
            <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ban@email.com" /></label>
            <label>Mật khẩu<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 8 ký tự" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <span>→</span></button>
            <p className="privacy-note">Thông tin tài khoản được bảo vệ an toàn.</p>
          </form>}
        </section>
      </main>
      <footer className="footer"><a className="brand" href="#home"><span className="brand-mark">L</span><span>lingua<span className="brand-light">pilot</span></span></a><span>Học một chút mỗi ngày, tiến xa hơn mỗi chặng đường.</span><a href="/jp/index.html">Thư viện tiếng Nhật ↗</a></footer>
    </div>
  )
}

export default App
