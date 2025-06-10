'use client';

import '../globals.css';
import LayoutWrapper from '../../components/LayoutWrapper';


export default function SymbolLegend() {
  const rows = [

// 1
    {
      left: (
          <>
            <img
                src="/equations/planck_time.svg"
                alt="t_p"
                style={{
                  height: '16.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.35em',
                  display: 'inline',
                }}
            />
            {' = 5.39125836832313 ... × 10'}
            <sup>−44</sup>
            {' s'}
          </>
      ),
      right: (
          <a
              href="/planck-constants"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Planck time
          </a>
      ),
    },

// 2
    {
      left: (
          <>
            <img
                src="/equations/planck_length.svg"
                alt="l_p"
                style={{
                  height: '16.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.35em',
                  display: 'inline',
                }}
            />
            {' = 1.61625918175645 ... × 10'}
            <sup>−35</sup>
            {' m'}
          </>
      ),
      right: (
          <a
              href="/planck-constants"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Planck length
          </a>
      ),
    },


// 3
    {
      left: (
          <>
            <img
                src="/equations/planck_charge.svg"
                alt="q_p"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 1.87554596713962 ... × 10'}
            <sup>−18</sup>
            {' C'}
          </>
      ),
      right: (
          <a
              href="/planck-constants"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Planck charge
          </a>
      ),
    },


// 4
    {
      left: (
          <>
            <img
                src="/equations/planck_temperature.svg"
                alt="T_p"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 1.41678698590795 ... × 10'}
            <sup>32</sup>
            {' kg'}
          </>
      ),
      right: (
          <a
              href="/planck-constants"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Planck temperature
          </a>
      ),
    },



// 5
    {
      left: (
          <>
            <img
                src="/equations/planck_mass.svg"
                alt="m_p"
                style={{
                  height: '14.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 2.17642683817579 ... × 10'}
            <sup>-8</sup>
            {' kg'}
          </>
      ),
      right: (
          <a
              href="/planck-constants"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Planck mass
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 6
    {
      left: (
          <>
            <img
                src="/equations/red-5.svg"
                alt="5"
                style={{
                  height: '14px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/5"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            number of dimensions
          </a>
      ),
    },


// 7
    {
      left: (
          <>
            <img
                src="/equations/blue-7.svg"
                alt="7"
                style={{
                  height: '14px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/7"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            break in scale symmetry
          </a>
      ),
    },

// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 8
    {
      left: (
          <>
            <img
                src="/equations/zhe_1.svg"
                alt="zhe_1"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 0.0854245431533304 ...'}
          </>
      ),
      right: (
          <a
              href="/hyperbolic-partition-eq"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            1<sup>st</sup> hyperbolic partition constant
          </a>
      ),
    },


// 9
    {
      left: (
          <>
            <img
                src="/equations/zhe_2.svg"
                alt="zhe_2"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 3.66756753485501 ...'}
          </>
      ),
      right: (
          <a
              href="/hyperbolic-partition-eq"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            2<sup>nd</sup> hyperbolic partition constant
          </a>
      ),
    },


// 10
    {
      left: (
          <>
            <img
                src="/equations/zhe_3.svg"
                alt="zhe_3"
                style={{
                  height: '13.5px',
                  width: 'auto',
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = − 1.87649603900417 ... + 4.06615262615972 ... '}
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '12px', // adjust size as needed
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                  marginLeft: '0.2em', // optional spacing
                }}
            />
          </>
      ),
      right: (
          <a
              href="/hyperbolic-partition-eq"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            3<sup>rd</sup> hyperbolic partition constant
          </a>
      ),
    },


// 11
    {
      left: (
          <>
            <img
                src="/equations/zhe_4.svg"
                alt="zhe_4"
                style={{
                  height: '13.5px',
                  width: 'auto',
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = − 1.87649603900417 ... − 4.06615262615972 ... '}
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '12px', // adjust size as needed
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                  marginLeft: '0.2em', // optional spacing
                }}
            />
          </>
      ),
      right: (
          <a
              href="/hyperbolic-partition-eq"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            4<sup>th</sup> hyperbolic partition constant
          </a>
      ),
    },


// 12
    {
      left: (
          <>
            <img
                src="/equations/zhe_r.svg"
                alt="zhe_r"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 4.47826244916751 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            hyperbolic radius constant
          </a>
      ),
    },


// 13
    {
      left: (
          <>
            <img
                src="/equations/zhe_theta.svg"
                alt="zhe_theta"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 2.00316562310924 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            hyperbolic radian constant
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 14
    {
      left: (
          <>
            <img
                src="/equations/g_gi.svg"
                alt="G_Gi"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 1.01494160640965 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/GiesekingsConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Gieseking's constant
          </a>
      ),
    },


// 15
    {
      left: (
          <>
            <img
                src="/equations/v_fe.svg"
                alt="V_fe"
                style={{
                  height: '17px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 2.02988321281930 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/FigureEightKnot.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            figure eight knot hyperbolic volume
          </a>
      ),
    },


// 16
    {
      left: (
          <>
            <img
                src="/equations/catalan_s_constant.svg"
                alt="K"
                style={{
                  height: '12.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 0.9159655941772190 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/CatalansConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Catalan's constant
          </a>
      ),
    },


// 17
    {
      left: (
          <>
            <img
                src="/equations/domino_tiling_constant.svg"
                alt="C_d"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.291560904030818 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/DominoTiling.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            domino tiling constant
          </a>
      ),
    },


// 18
    {
      left: (
          <>
            <img
                src="/equations/d_d.svg"
                alt="D_d"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 1.79162281206959 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/input?i=1.7916228120695934247305470"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            dimer constant
          </a>
      ),
    },


// 19
    {
      left: (
          <>
            <img
                src="/equations/omega_1_constant.svg"
                alt="omega_1"
                style={{
                  height: '13px',
                  width: 'auto',
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 0.764977018528596 ... + 1.32497062714087 ... '}
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '12px', // adjust size as needed
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                  marginLeft: '0.2em', // optional spacing
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/Omega-2Constant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            omega_1 constant
          </a>
      ),
    },


// 20
    {
      left: (
          <>
            <img
                src="/equations/omega_2_constant.svg"
                alt="omega_2"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.529954037057192 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/Omega-2Constant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            omega_2 constant
          </a>
      ),
    },


// 21
    {
      left: (
          <>
            <img
                src="/equations/plastic_constant.svg"
                alt="P"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 1.32471795724474 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/PlasticConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            plastic constant
          </a>
      ),
    },


// 22
    {
      left: (
          <>
            <img
                src="/equations/madelung_constant.svg"
                alt="M"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = − 1.74756459463318 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Madelung_constant"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Madelung constant
          </a>
      ),
    },

// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 23
    {
      left: (
          <>
            <img
                src="/equations/power_tower_of_i.svg"
                alt="power tower of i"
                style={{
                  height: '23px',
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {'= 0.438282936727032 ... + 0.360592471871385 ... '}
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '12px', // adjust size as needed
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                  marginLeft: '0.2em', // optional spacing
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/PowerTower.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            power tower of <img
              src="/equations/i.svg"
              alt="i"
              style={{
                height: '12px', // adjust size as needed
                width: 'auto',
                verticalAlign: '-0.0em',
                display: 'inline',
                marginLeft: '0.2em', // optional spacing
              }}
          />
          </a>
      ),
    },


// 24
    {
      left: (
          <>
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '13.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.1em',
                  display: 'inline',
                }}
            />
            {' = 0 + 1'}
            <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '12px', // adjust size as needed
                  width: 'auto',
                  verticalAlign: '-0.0em',
                  display: 'inline',
                  marginLeft: '0.2em', // optional spacing
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Imaginary_unit"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            imaginary unit
          </a>
      ),
    },


// 25
    {
      left: (
          <>
            <img
                src="/equations/w_we.svg"
                alt="W_We"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 0.47494937998792 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/WeierstrassConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Weierstrass constant
          </a>
      ),
    },


// 26
    {
      left: (
          <>
            <img
                src="/equations/pi.svg"
                alt="pi"
                style={{
                  height: '8.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 3.14159265358979 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Pi"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Archimedes' constant
          </a>
      ),
    },


// 27
    {
      left: (
          <>
            <img
                src="/equations/universal_parabolic_constant.svg"
                alt="P_up"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 2.29558714939263 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Universal_parabolic_constant"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            universal parabolic constant
          </a>
      ),
    },


// 28
    {
      left: (
          <>
            <img
                src="/equations/g_g.svg"
                alt="G_g"
                style={{
                  height: '17px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.15872847301812 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/GoatProblem.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            tether length for grazing half the unit circle
          </a>
      ),
    },


// 29
    {
      left: (
          <>
            <img
                src="/equations/s_symbol.svg"
                alt="s"
                style={{
                  height: '8.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 5.24411510858423 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/LemniscateConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            arc length of the unit lemniscate
          </a>
      ),
    },


// 30
    {
      left: (
          <>
            <img
                src="/equations/l_constant.svg"
                alt="L"
                style={{
                  height: '12px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 2.622057554292119 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/LemniscateConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            lemniscate constant
          </a>
      ),
    },


// 31
    {
      left: (
          <>
            <img
                src="/equations/l_1_constant.svg"
                alt="L_1"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.31102877714605 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/LemniscateConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            1<sup>st</sup> lemniscate constant
          </a>
      ),
    },


// 32
    {
      left: (
          <>
            <img
                src="/equations/l_2.svg"
                alt="L_2"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.599070117367796 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/LemniscateConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            2<sup>nd</sup> lemniscate constant
          </a>
      ),
    },


// 33
    {
      left: (
          <>
            <img
                src="/equations/c_u.svg"
                alt="C_U"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.847213084793979 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/UbiquitousConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            ubiquitous constant
          </a>
      ),
    },


// 34
    {
      left: (
          <>
            <img
                src="/equations/g_ga.svg"
                alt="G_Ga"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.834626841674073 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/GausssConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Gauss's constant
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 35
    {
      left: (
          <>
            <img
                src="/equations/continued_fraction_constant.svg"
                alt="C_CF"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.697774657964819 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/input?i=0.697774657964007982006790"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            continued fraction constant
          </a>
      ),
    },


// 36
    {
      left: (
          <>
            <img
                src="/equations/c_r1.svg"
                alt="C_R1"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.998136044598509 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/RamanujanContinuedFractions.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Ramanujan's 1<sup>st</sup> continued fraction constant
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 37
    {
      left: (
          <>
            <img
                src="/equations/e_symbol.svg"
                alt="e"
                style={{
                  height: '9.5px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 2.71828182845904 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/E_(mathematical_constant)"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Euler's number
          </a>
      ),
    },


// 38
    {
      left: (
          <>
            <img
                src="/equations/euler-mascheroni_constant.svg"
                alt="y"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.577215664901532 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/Euler-MascheroniConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Euler-Mascheroni constant
          </a>
      ),
    },


// 38
    {
      left: (
          <>
            <img
                src="/equations/sierpinski_constant.svg"
                alt="S"
                style={{
                  height: '14px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
            {' = 0.822825249678847 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/SierpinskiConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Sierpi&#324;ski's constant
          </a>
      ),
    },


// 39
    {
      left: (
          <>
            <img
                src="/equations/d_do.svg"
                alt="D_Do"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.739085133215160 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Dottie_number"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Dottie number
          </a>
      ),
    },


// 40
    {
      left: (
          <>
            <img
                src="/equations/c_cfp.svg"
                alt="C_CFP"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.19967864025773 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/HyperbolicCotangent.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Real fixed point of the hyperbolic cotangent
          </a>
      ),
    },


// 41
    {
      left: (
          <>
            <img
                src="/equations/j_0-1.svg"
                alt="j_0,1"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 2.404825557695772 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/BesselFunctionZeros.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            1<sup>st</sup> root of the Bessel function
          </a>
      ),
    },


// 42
    {
      left: (
          <>
            <img
                src="/equations/c_hsm.svg"
                alt="C_HSM"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.353236371854995 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/Hafner-Sarnak-McCurleyConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Hafner-Sarnak-McCurley constant
          </a>
      ),
    },


// 43
    {
      left: (
          <>
            <img
                src="/equations/c_kl.svg"
                alt="C_KL"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.78723165018296 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/Komornik-LoretiConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Komornik-Loreti constant
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 44
    {
      left: (
          <>
            <img
                src="/equations/c_q.svg"
                alt="C_Q"
                style={{
                  height: '17px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 0.605443657196732 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/QRSConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            QRS constant
          </a>
      ),
    },


// 45
    {
      left: (
          <>
            <img
                src="/equations/c_qa.svg"
                alt="C_QA"
                style={{
                  height: '17px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 2.03816937970215 ...'}
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/QRSConstant.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            associated QRS constant
          </a>
      ),
    },


// 45
    {
      left: (
          <>
            <img
                src="/equations/alpha_f.svg"
                alt="alpha_F"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 2.50290787509589 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            https://en.wikipedia.org/wiki/Feigenbaum_constants
          </a>
      ),
    },


// 45
    {
      left: (
          <>
            <img
                src="/equations/del_f.svg"
                alt="del_F"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 4.66920160910299 ...'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            https://en.wikipedia.org/wiki/Feigenbaum_constants
          </a>
      ),
    },


// Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 46
    {
      left: (
          <>
            <img
                src="/equations/t_0.svg"
                alt="T_0"
                style={{
                  height: '16px',
                  width: 'auto',
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 2.73150000000000 ... × 10'}
            <sup>2</sup>
            {' kelvin'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Kelvin"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            freezing point of water
          </a>
      ),
    },


// 47
    {
      left: (
          <>
            <img
                src="/equations/p_0.svg"
                alt="p_0"
                style={{
                  height: '12px',
                  width: 'auto',
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.01325003754773 ... × 10'}
            <sup>5</sup>
            {' pascal'}
          </>
      ),
      right: (
          <a
              href="https://www.wolframalpha.com/input?i=1+bar"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            1 bar
          </a>
      ),
    },


// 48
    {
      left: (
          <>
            <img
                src="/equations/p_1.svg"
                alt="p_1"
                style={{
                  height: '12px',
                  width: 'auto',
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 1.01325003754773 ... × 10'}
            <sup>5</sup>
            {' pascal'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Pascal_(unit)"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            standard atmospheric pressure
          </a>
      ),
    },


// 48
    {
      left: (
          <>
            <img
                src="/equations/e_1.svg"
                alt="E_1"
                style={{
                  height: '16px',
                  width: 'auto',
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 6.09110229711386 ... × 10'}
            <sup>-24</sup>
            {' joules'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Caesium_standard"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            energy associated with <img
              src="/equations/hyperfine_symbol.svg"
              alt="hyperfine transition frequency of Cs-133"
              style={{
                height: '16px',
                width: 'auto',
                verticalAlign: '-0.3em',
                display: 'inline',
              }}
          />
          </a>
      ),
    },


// 50
    {
      left: (
          <>
            <img
                src="/equations/frequency_1.svg"
                alt="f_1"
                style={{
                  height: '16px',
                  width: 'auto',
                  verticalAlign: '-0.2em',
                  display: 'inline',
                }}
            />
            {' = 5.40000000000000 ... × 10'}
            <sup>14</sup>
            {' Hz'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Luminous_efficacy"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            frequency of max light conversion
          </a>
      ),
    },


// 51
    {
      left: (
          <>
            <img
                src="/equations/lambda_peak.svg"
                alt="lambda_peak"
                style={{
                  height: '18px',
                  width: 'auto',
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 4.96511423174427 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Wien%27s_displacement_law"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            peak <img
              src="/equations/lambda_symbol.svg"
              alt="lambda_peak"
              style={{
                height: '13.5px',
                width: 'auto',
                verticalAlign: '-0.05em',
                display: 'inline',
              }}
          /> of spectral radiance/unit wavelength
          </a>
      ),
    },


// 52
    {
      left: (
          <>
            <img
                src="/equations/nu_peak.svg"
                alt="nu_peak"
                style={{
                  height: '15px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.25em',
                  display: 'inline',
                }}
            />
            {' = 2.82143937212207 ...'}
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Wien%27s_displacement_law"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            peak emission of spectral flux/unit frequency
          </a>
      ),
    },


    // Spacer row
    {
      left: <div style={{height: '0.5rem'}}></div>,
      right: '',
    },


// 53
    {
      left: (
          <>
            <img
                src="/equations/log(x).svg"
                alt="log(x)"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://mathworld.wolfram.com/NaturalLogarithm.html"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            natural logarithm
          </a>
      ),
    },


// 54
    {
      left: (
          <>
            <img
                src="/equations/gamma_function.svg"
                alt="gamma(x)"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Gamma_function"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            gamma function
          </a>
      ),
    },


// 55
    {
      left: (
          <>
            <img
                src="/equations/zeta_function.svg"
                alt="zeta(x)"
                style={{
                  height: '16px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Riemann_zeta_function"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            Riemann zeta function
          </a>
      ),
    },


// 56
    {
      left: (
          <>
            <img
                src="/equations/derangement_symbol.svg"
                alt="!n"
                style={{
                  height: '13px',           // Set preferred height
                  width: 'auto',            // Maintain aspect ratio
                  verticalAlign: '-0.0em',
                  display: 'inline',
                }}
            />
          </>
      ),
      right: (
          <a
              href="https://en.wikipedia.org/wiki/Derangement"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            derangement function
          </a>
      ),
    },

 // Spacer row
    {
      left: <div style={{height: '6.4rem'}}></div>,
      right: '',
    },


    // Paste more here...
  ];


  return (
      <LayoutWrapper>
        <div className="symbol-legend-page">
          <div className="symbol-overlay"/>
          <div className="legend-content">
            <div className="legend-title">Symbol Legend</div>
            <div className="legend-rows">
              {rows.map((row, index) => (
                  <div key={index} className="legend-row">
                    <div className="legend-left">{row.left}</div>
                    <div className="legend-right">{row.right}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
  );
}

