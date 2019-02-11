import Link from 'next/link'
import Router from 'next/router';
import React from 'react'
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import NoSsr from '@material-ui/core/NoSsr';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';

const routes = [
  {label:'Home',route:'/'},
  {label:'About us',route:'/about'},
  {label:'Chatbot',route:'/chatbot'}
]


let newIndex = 0;
let lastIndex ;

const styles = theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
});

class Navigation extends React.Component {
  constructor(props){
    super(props)
    this.state ={
      value:0
    }
  }

  handleChange =(event, index) => {
    lastIndex = newIndex;
    newIndex = index;
    Router.push(routes[index].route);
  };

  componentDidMount(){
    if (typeof lastIndex !== "undefined"){
      setTimeout(() => {
        lastIndex = undefined
        this.forceUpdate()
      }, 0)
    }
  }

  render(){
    const index = typeof lastIndex === 'undefined'
      ? newIndex
      : lastIndex
    const {classes}=this.props;
    const {value}=this.state;
    return(
        <div className={classes.root}>
          <AppBar position="static">
            <Tabs variant="fullWidth" value={index} onChange={this.handleChange}>
              {routes.map((route, index) => (
                <Tab key={index} label={route.label} />
              ))}
            </Tabs>
          </AppBar>
        </div>
    )
  }
}

export default withStyles(styles)(Navigation);
