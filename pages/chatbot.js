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
      chatBotResponse:""
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  };

  componentDidMount () {
    this.callApi()
      .then(res => this.setState({ response: res.status }))
      .catch(err => console.log(err));
    this.hydrateStateWithLocalStorage();
    if (this.state.user.sessionID == ""){
      this.setState({userID:uuidv4()})
      localStorage.setItem("userID":this.state.userID);
    }
  }

  async callApi () {
    const response = await fetch('/livecheck');
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit (event) {

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
    var userProfile1 = this.state.userProfile;
    userProfile1.answer = event.target.value;
    this.setState({ userProfile: userProfile1 });
  }

  render () {
    return (
      <div>
        <div id='question'>
          {this.state.userProfile.currentQ.question}
        </div>
        <div className='Answer'>
          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Answer:</strong>
            </p>
            <input
              type='text'
              value={this.state.userProfile.answer}
              onChange={this.handleChange}
            />
          </form>
          <p>{JSON.stringify(this.state.userProfile)}</p>
          <p>Suggested Books:</p>
          {this.state.bookResult.map((item, index) => (
            <p id={index}>{item}</p>
          ))}
        </div>
      </div>
    );
  }
}
export default Conversation;
