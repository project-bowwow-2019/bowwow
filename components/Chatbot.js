import React from 'react';
import uuidv4 from 'uuid/v4';

class Conversation extends React.Component {
  // Conversation component is used to route all user conversation
  // Its state should include the user profile and if conversation is done
  // User profile contains relevancy list, qAskedID, attribute, currentQ, answer

  constructor (props) {
    super(props);
    this.state = {
      userID:"",
      sessionID:"",
      userUtterance: "",
      chatbotResponse:"hello!"
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  };

  async componentDidMount () {
    this.serverLivecheck()
      .then(res => this.setState({ response: res.status }))
      .catch(err => console.log(err));
    await this.hydrateStateWithLocalStorage();
    if (this.state.sessionID === ""){
      var id = await uuidv4();
      await this.setState({sessionID:id})
      localStorage.setItem("sessionID", id)
    }
  }

  async serverLivecheck () {
    const response = await fetch('/livecheck');
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit (event) {
    console.log('in Chatbot handlesubmit');
    event.preventDefault();
    fetch('/chatbot/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.state)
    })
    .then(res => res.json())
    .then(data => {
      this.setState({chatbotResponse:data.fulfillmentText, userUtterance:""})
      console.log(this.state)
    })
    .catch(err => {
      console.log(err.status);
      this.setState({chatbotResponse:err.error})
    })
  };

  hydrateStateWithLocalStorage() {
    // for all items in state
    for (let key in this.state) {
      // if the key exists in localStorage
      if (localStorage.hasOwnProperty(key)) {
        // get the key's value from localStorage
        let value = localStorage.getItem(key);
        // parse the localStorage string and setState
        try {
          value = JSON.parse(value);
          this.setState({ [key]: value });
        } catch (e) {
          // handle empty string
          this.setState({ [key]: value });
        }
      }
    }
  }

  handleChange (event) {
    this.setState({ userUtterance: event.target.value });
  }

  render () {
    return (
      <div>
        <div id='chatbot'>
          {this.state.chatbotResponse}
        </div>
        <div className='answer'>
          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Answer:</strong>
            </p>
            <input
              type='text'
              value={this.state.userUtterance}
              onChange={this.handleChange}
            />
          </form>
          <p> {this.state.sessionID}</p>
        </div>
      </div>
    );
  }
}
export default Conversation;
