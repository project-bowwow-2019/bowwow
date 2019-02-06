import Link from 'next/link'

const linkStyle = {
  marginRight: 15
}

const Navigation = () => (
    <div>
        <Link href="/">
          <a style={linkStyle}>Home</a>
        </Link>
        <Link href="/about">
          <a style={linkStyle}>About</a>
        </Link>
        <Link href="/chatbot">
          <a style = {linkStyle}> Chatbot </a>
        </Link>
    </div>
)

export default Navigation
