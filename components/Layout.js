import Navigation from './Navigation'

const layoutStyle = {
  margin: 20,
  padding: 20,
  border: '1px solid #DDD'
}

const Layout = (props) => (
  <div style={layoutStyle}>
    <Navigation />
    {props.children}
  </div>
)

export default Layout
