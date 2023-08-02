2import React,{Component} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import SLChart from './SLChart'


class Header extends Component {
  render() {
    return (
      <header>
        <img className='trm-logo' src='trm_square_logo.png' />
        <img className='iswim-logo' src='iswim_logo.png' />
        <p>Sick Leave Pattern Recognition System</p>
      </header>
    )
  }
}

class Intro extends Component {
  render() {
    return (
      <div className="intro">
        <p>Search for the case reference number to find a relevant case.</p>
      </div>
    )
  }
}

class Footer extends Component {
  render() {
    return (
      <div className="footer">&copy; TRM (HK) LIMITED</div>
    )
  }
}

class Page extends Component {
  render() {
    return (
      <div>
       <Header />
       <div className="main">
         <Intro />
         <SLChart />
       </div>
       <Footer />
      </div>
    );
  }
}



// ========================================

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Page />);
