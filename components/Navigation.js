import Link from 'next/link'
import React from 'react'
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

const styles = theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
});

class MyLink extends React.Component {
  render() {
    const { className, href, hrefAs, children, prefetch } = this.props
    return (
        <Link href={href} as={hrefAs} prefetch>
          <a className={className}>
            {children}
          </a>
        </Link>
    )
  }
}

class Navigation extends React.Component {
  constructor(props){
    super(props)
    this.state ={
      value:0
    }
  }

  handleChange =(event, value) => {
    this.setState({value});
  }

  render(){
    const {classes}=this.props;
    const {value}=this.state;
    return(
      <NoSsr>
          <div className={classes.root}>
            <AppBar position="static">
              <Tabs variant="fullWidth" value={value} onChange={this.handleChange}>
                <Tab component={MyLink} href={'/'} label='Home'/>
                <Tab component={MyLink} href={'/about'} label='About us'/>
                <Tab component={MyLink} href={'/chatbot'} label='Chabot'/>
              </Tabs>
            </AppBar>
          </div>
        </NoSsr>
    )
  }
}

export default withStyles(styles)(Navigation);
