import React from 'react';
import dynamic from 'next/dynamic';
import 'react-chat-widget/lib/styles.css';
const Widget = dynamic(() => import('react-chat-widget').then(m => {
  const {Widget} = m;
  Widget.__webpackChunkName = m.__webpackChunkName;
  return Widget;
}), {ssr:false});

class ChatWidgetTest extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      mounted:false,
      responseMessage: "Hello!",
    }
  }

  async componentDidMount(){
    this.setState({mounted:true});
    const widget = await import('react-chat-widget')
    this.setState({wdiget:widget})
    widget.addResponseMessage(this.state.responseMessage)
  }
  render(){
    return(
      <div className='App'>
        <Widget
          subtitle='Smogshop agent test'
          title = 'Chatbot test'/>
      </div>
    )
  }
}

export default ChatWidgetTest;
