# constant_engine

Python verifier for the constant construction system.

Core rule (binomial constructor):
Constant = (EG * EB) * (1 + (IG * R * IB))

- EG: external geometry fraction (numerator/denominator maps)
- EB: external boundary fraction
- IG: inversion geometry fraction
- R: root transform (token + power)
- IB: fixed inversion boundary (implicit token "IB" in symbols.csv)

## Quick start

```bash
source venv/bin/activate
pip install pyyaml

python src/verify_one.py demo
python src/verify_all.py
