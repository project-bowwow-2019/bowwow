import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    align:'center'
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
      mainBusiness:'',
      labelWidth:0
    }
  };

  componentDidMount() {
    this.setState({
      labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
    });
  }

  handleChange = name => event => {
    this.setState({ [name]: event.target.value });
  };

  render(){
    const {classes}=this.props;

    return(
      <div className={classes.root}>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel ref={ref => {this.InputLabelRef = ref;}} htmlFor="outlined-age-native-simple">
            Category
          </InputLabel>
          <Select native value={this.state.mainBusiness} onChange={this.handleChange('mainBusiness')}
            input={
              <OutlinedInput name="category" labelWidth={this.state.labelWidth} id="outlined-age-native-simple"/>
            }>
            <option value="" />
            <option value={'restaurant'}>Restaurant</option>
            <option value={'carRepair'}>Auto Repair</option>
            <option value={'healthcare'}>Healthcare</option>
        </Select>
        </FormControl>
      </div>
    )
  }
}
export default withStyles(styles)(MainBusinessSelect);
