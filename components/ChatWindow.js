import React from 'react';
import dynamic from 'next/dynamic';
//import {Chat, addResponseMessage, addLinkSnippet, addUserMessage} from 'react-chat-popup';
// import {Chat} from 'react-chat-popup';
const Chat = dynamic(() => import('react-chat-popup').then(m => {
  const {Chat} = m;
  Chat.__webpackChunkName = m.__webpackChunkName;
  return Chat;
}), {ssr:false});

//const chatPopup = dynamic(import('react-chat-popup'), {ssr:false});



class ChatWindow extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      responseMessage: "Hello!"
    }
    this.handleNewUserMessage = this.handleNewUserMessage.bind(this);
  }

  async componentDidMount(){
    const chatPopup = await import('react-chat-popup')
    this.setState({chatPopup:chatPopup})
    chatPopup.addResponseMessage(this.state.responseMessage)
    console.log('componentMounted')
  }

  handleNewUserMessage = async (newMessage) => {
    console.log(`New message incoming! ${newMessage}`);
    await this.props.handleUserUtterance(newMessage);
    await this.setState({responseMessage:this.props.responseMessage})
    //await this.setState({responseMessage:this.props.responseMessage})

    this.state.chatPopup.addResponseMessage(this.state.responseMessage)
  }

  render() {
    return (
      <div className="App">
          <Chat handleNewUserMessage = {this.handleNewUserMessage}/>
      </div>
    );
  }
}

export default ChatWindow;
