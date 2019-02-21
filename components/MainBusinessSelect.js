import React from 'react';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import BusinessSubtypeSelect from './BusinessSubtypeSelect';
import Button from '@material-ui/core/Button';
import uuidv4 from 'uuid/v4';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent:'center'
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 2,
  },
});

class MainBusinessSelect extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      category:'',
      labelWidth:0,
      subtype:[],
      businessType:{},
      userID:''
    }
    this.selectBusiness = this.selectBusiness.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  };

  async componentDidMount() {
    this.setState({
      labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
    });
    await this.hydrateStateWithLocalStorage();
  }

  handleChange = name => async event => {
    this.setState({ [name]: event.target.value });
    this.setState({businessType:{}})
    const response = await fetch('/chatbotCreate/api/getBusinessSubtype?businessCategory='+ event.target.value)
    const body = await response.json()
    if (response.status !== 200) throw Error(body.message);
    this.setState({subtype:body});
  };

  selectBusiness(data){
    this.setState({businessType:data});
  }

  async handleSubmit(event){
    event.preventDefault();
    if (this.state.userID === ''){
      var id = await uuidv4();
      await this.setState({userID:id})
      localStorage.setItem("userID", id)
    }
    const response = await fetch('/chatbotCreate/api/getCommonQuestions?businessCategory='+this.state.businessType.category+'&businessSubtype='+this.state.businessType.subtype);
    const body = await response.json();
    if(response.status !==200) throw Error(body.message);

    this.props.handleBusinessTypeSubmit(this.state.businessType, body, this.state.userID)
  }

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


  render(){
    const {classes}=this.props;

    return(
      <div>
        <div>
          <Typography variant='h4' gutterbottom='true' align='center'>
            Create your own chatbot
          </Typography>
          <Typography variant='subtitle1' align='center'>
            What type of business do you have?
          </Typography>
          <Typography variant='caption' align='center'>
            Knowing this will help us specialize the chatbot for what you need
          </Typography>
        </div>
        <form  className={classes.root} onSubmit={this.handleSubmit}>
          <FormControl variant="outlined" className={classes.formControl}>
            <InputLabel ref={ref => {this.InputLabelRef = ref;}} htmlFor="outlined-age-native-simple">
              Category
            </InputLabel>
            <Select native value={this.state.category} onChange={this.handleChange('category')}
              input={
                <OutlinedInput name="category" labelWidth={this.state.labelWidth} id="outlined-age-native-simple"/>
              }>
              <option value="" />
              {this.props.category.map((item, index) => (
                <option key={index} value={item.category}>{item.category}</option>
              ))};
              </Select>
          </FormControl>
          <div>
            {this.state.subtype.length!=0 ?  (
              <BusinessSubtypeSelect category={this.state.category} subtype={this.state.subtype} selectBusiness = {this.selectBusiness}/>
            ): null}
          </div>
          <div>
              {Object.keys(this.state.businessType).length != 0 ? (
                <Button variant='contained' color='primary' type='submit'>
                  Start!
                </Button>): null
              }
          </div>
        </form>
      </div>
    )
  }
}
export default withStyles(styles)(MainBusinessSelect);
