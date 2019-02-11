import Link from 'next/link'
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import NoSsr from '@material-ui/core/NoSsr';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';


const linkStyle = {
  marginRight: 15
}

function LinkTab(props) {
  return <Tab component="a" onClick={event => event.preventDefault()} {...props} />;
}

const Navigation = () => (
    //<div>
        // <Link href="/">
        //   <a style={linkStyle}>Home</a>
        // </Link>
        // <Link href="/about">
        //   <a style={linkStyle}>About</a>
        // </Link>
        // <Link href="/chatbot">
        //   <a style = {linkStyle}> Chatbot </a>
        // </Link>
    //</div>

    <NoSsr>
        <div>
          <AppBar position="static">
            <Tabs variant="fullWidth">
              //<Tab>
                <Link href="/">
                  <a style={linkStyle}>Home</a>
                </Link>
              //</Tab>
              //<Tab>
              <Link href="/about">
                <a style={linkStyle}>About</a>
              </Link>
              //</Tab>
              //<Tab>
                <Link href="/chatbot">
                  <a style = {linkStyle}> Chatbot </a>
                </Link>
              //</Tab>
            </Tabs>
          </AppBar>
        </div>
      </NoSsr>
)

export default Navigation
