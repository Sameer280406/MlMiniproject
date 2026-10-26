

# 💻 laptops-specs-dataset

> An end-to-end data collection, cleaning, and feature engineering project on Indian laptop specifications (2025). Includes raw HTML scraping, systematic cleaning, hybrid-core CPU/GPU parsing, and 27+ structured features for EDA and ML.

# Laptops Cleaned Dataset

> Clean and structured laptops dataset for analysis and price prediction.


![License: CC0](https://img.shields.io/badge/License-CC0-blue.svg)
![Python 3.8+](https://img.shields.io/badge/Python-3.8+-green.svg)
[![Kaggle](https://img.shields.io/badge/Kaggle-Dataset-blue.svg)](https://www.kaggle.com/datasets/githubmasterin/laptops-cleaned-dataset)
[![GitHub](https://img.shields.io/badge/GitHub-abhinavflac-blue?logo=github)](https://github.com/abhinavflac/laptops-specs-dataset)

## 📋 About Dataset

This dataset contains **992 laptops** released in India (as of December 2025), including detailed hardware specifications, pricing, CPU/GPU architecture, display features, and category types. It is highly suitable for:

- 📊 **Exploratory Data Analysis (EDA)**
- 🤖 **Machine Learning**
- 📱 **Product Comparison**
- 💰 **Price Prediction Modeling**

Each row represents a laptop sold on online marketplaces with attributes covering:

- Brand & Model Details
- Pricing & Ratings
- CPU Specifications (brand, family, series, model, core architecture)
- GPU Details (brand, series, model, VRAM, integrated/dedicated type)
- Memory & Storage
- Display characteristics (size, resolution)
- Operating system, warranty, and category (Gaming / Business / Thin & Light / General)

### Key Highlights

- 🔄 Collected 1,000+ laptop listings from Indian e-commerce websites
- 🧹 Cleaned and structured into **992** high-quality laptop entries
- 🛠️ Engineered **27** structured features from raw text columns
- ✅ Parsed complex CPU and GPU specifications with hybrid-core layout
- 📊 Ready for ML modeling and data analysis

## 📊 Column Descriptions

| Category | Columns | Description |
|----------|---------|-------------|
| **Basic Info** | `brand`, `model`, `device_category`, `price`, `rating` | Laptop identity, category type, and pricing details |
| **CPU Details** | `cpu_brand`, `cpu_family`, `cpu_series`, `cpu_model`, `cpu_suffix`, `cpu_core_count`, `cpu_thread_count`, `cpu_p_cores`, `cpu_e_cores`, `cpu_lp_e_cores` | Complete CPU architecture with hybrid-core layout |
| **Memory** | `ram_gb`, `storage_gb` | RAM and internal SSD information |
| **Display** | `display_width_px`, `display_height_px`, `display_size_inch` | Screen resolution and diagonal display size |
| **GPU Details** | `gpu_brand`, `gpu_series`, `gpu_model`, `gpu_vram_gb`, `gpu_type` | GPU branding, series, VRAM, and Integrated/Dedicated tag |
| **OS & Warranty** | `os_name`, `warranty_years` | Operating System and warranty duration |

### Detailed Column Descriptions

| Column | Description |
|--------|-------------|
| `brand` | Brand or manufacturer of the laptop (e.g., HP, Dell, Lenovo, Apple) |
| `model` | Cleaned model name / configuration label for the laptop |
| `device_category` | High-level usage segment (e.g., Gaming, Business, Thin & Light, General) |
| `price` | Listed price of the laptop in Indian Rupees |
| `rating` | User / expert rating score on a 0–100 scale |
| `cpu_brand` | CPU manufacturer (Intel, AMD, Apple, Qualcomm, etc.) |
| `cpu_family` | CPU family / marketing line (e.g., Core, Ryzen, M-Series) |
| `cpu_series` | Series within the family (e.g., Core i5, Ryzen 7, Core Ultra 7) |
| `cpu_model` | Specific CPU model number (e.g., 13420H, 7530U, M4 Pro) |
| `cpu_suffix` | CPU suffix code indicating power / segment (e.g., U, H, HX, Pro, Max) |
| `cpu_core_count` | Total number of CPU cores |
| `cpu_thread_count` | Total number of CPU threads |
| `cpu_p_cores` | Count of performance cores (P-cores), where applicable |
| `cpu_e_cores` | Count of efficiency cores (E-cores), where applicable |
| `cpu_lp_e_cores` | Count of low-power efficiency cores (LP E-cores), mainly newer Intel |
| `ram_gb` | Installed RAM capacity in gigabytes |
| `storage_gb` | Total internal SSD / HDD storage in gigabytes |
| `display_width_px` | Horizontal screen resolution in pixels |
| `display_height_px` | Vertical screen resolution in pixels |
| `display_size_inch` | Diagonal display size in inches |
| `gpu_brand` | GPU manufacturer (NVIDIA, AMD, Intel, Apple, Qualcomm, etc.) |
| `gpu_series` | GPU product line (e.g., GeForce RTX, Radeon, Iris Xe, Apple GPU) |
| `gpu_model` | Specific GPU model (e.g., RTX 4060, Radeon Graphics, Apple 10-Core GPU) |
| `gpu_vram_gb` | Dedicated GPU memory in gigabytes (NaN for integrated-only GPUs) |
| `gpu_type` | Type of graphics solution: Integrated or Dedicated |
| `os_name` | Operating system shipped with the laptop (Windows, Mac, Ubuntu, etc.) |
| `warranty_years` | Warranty period in years |

## 📈 Data Statistics

### Brand Distribution
- **Lenovo**: 23%
- **HP**: 22%
- **Other (541 models)**: 55%

### Device Category Distribution
- **General**: 39%
- **Gaming**: 26%
- **Thin & Light / Business / Other**: 35%

### Price Distribution (₹)
| Range | Count |
|-------|-------|
| ₹12,490 - ₹71,840 | 554 |
| ₹71,840 - ₹131,190 | 269 |
| ₹131,190 - ₹190,540 | 102 |
| ₹190,540 - ₹249,890 | 31 |
| ₹249,890 - ₹309,240 | 16 |
| ₹309,240+ | 20 |

### CPU Brand Distribution
- **Intel**: 71%
- **AMD**: 23%
- **Other (Apple, Qualcomm)**: 6%

### CPU Family Distribution
- **Core**: 48%
- **Ryzen**: 23%
- **Other (M-Series, Celeron, etc.)**: 29%

### GPU Brand Distribution
- **Intel**: 49%
- **NVIDIA**: 29%
- **AMD / Apple / Other**: 22%

### GPU Type Distribution
- **Integrated**: 70%
- **Dedicated**: 29%
- **Other**: 1%

### Operating System
- **Windows**: 94%
- **DOS**: 2%
- **Mac / Linux / Other**: 4%

## 📝 Sample Data

| brand | model | device_category | price | cpu_brand | cpu_series | gpu_brand | gpu_model | gpu_type |
|-------|-------|-----------------|-------|-----------|------------|-----------|-----------|----------|
| lenovo | Lenovo Legion Pro 5 16IAX10 | Gaming | 189990 | Intel | Core Ultra 7 | NVIDIA | RTX 5060 | Dedicated |
| hp | HP Victus 15-fa2303tx Gaming | Gaming | 82999 | Intel | Core I5 | NVIDIA | RTX 3050 | Dedicated |
| asus | Asus Vivobook Go 15 E1504FA | Thin & Light | 34990 | AMD | Ryzen 3 | AMD | Radeon | Integrated |
| apple | Apple MacBook Pro 14 2025 | General | 164490 | Apple | M5 | Apple | Apple 10-Core GPU | Integrated |
| dell | Dell 16 Alienware Gaming | Gaming | 472990 | Intel | Core Ultra 9 | NVIDIA | RTX 5090 | Dedicated |
| msi | MSI Modern 14 C7M-105IN | General | 40990 | AMD | Ryzen 5 | AMD | Radeon | Integrated |

## ✨ Features

- **Data Extraction**: Web scraping with systematic data collection
- **Data Cleaning**: 200+ lines of systematic cleaning logic
- **Feature Engineering**: Regex-based extraction of numeric values from text
- **CPU Parsing**: Extract brand, family, series, model, suffix, core counts
- **GPU Parsing**: Extract brand, series, model, VRAM, integrated vs dedicated
- **Device Classification**: Automatic categorization (Gaming, Business, Thin & Light, etc.)
- **ML-Ready**: Structured dataset for predictive modeling

## 💡 Usage Ideas

### Exploratory Data Analysis (EDA)
- Brand-wise pricing comparison
- Market segmentation (Gaming vs Business vs Thin & Light)
- Trends in CPU & GPU evolution (Intel/AMD/NVIDIA/Apple/Snapdragon)

### Machine Learning
- 🤖 Price prediction models (regression)
- 📈 Feature importance analysis
- 🎯 Brand clustering and segmentation
- 💰 Value-for-money recommendation systems

### Data Analysis
- 📊 Market trend analysis
- 🔍 Hardware specification evolution
- 💵 Pricing strategy insights
- 📱 Processor and GPU trends

## 📂 Repository Structure

```
laptops-dataset/
├── LICENSE
├── README.md
├── requirements.txt
│
├── data/
│   ├── raw/
│   │   └── laptops_raw.csv          # Original scraped data
│   └── processed/
│       └── laptops_cleaned.csv      # Cleaned dataset (992 laptops)
│
├── images/                           # Visualizations & assets
│
├── notebooks/
│   ├── 01_data_cleaning.ipynb       # Data cleaning & feature engineering
│   └── 02_eda.ipynb                 # Exploratory data analysis
│
├── scraped/
│   └── smartprix_laptops.html       # Raw scraped HTML
│
└── scripts/
    └── scrape.py                    # Selenium-based scraper
```

## 🔄 Data Pipeline

### 1️⃣ Data Collection → `scripts/scrape.py`
```python
# Selenium automation for dynamic content
- Infinite scroll automation
- Load all laptop listings
- Save HTML for reproducibility
```
Output: `scraped/smartprix_laptops.html`

### 2️⃣ Data Cleaning → `notebooks/01_data_cleaning.ipynb`
```python
# Systematic cleaning & validation
- Remove currency symbols from prices
- Extract brand from model names
- Clean RAM/Storage values
- Handle missing values
```
Output: Cleaned and validated dataset

### 3️⃣ Feature Engineering → `notebooks/01_data_cleaning.ipynb`
```python
# Text → Structured data
- Parse processor specs (brand, family, series, model, suffix)
- Extract core details (core_count, threads, P-cores, E-cores, LP-E cores)
- Parse GPU information (brand, series, model, VRAM)
- Classify device types (Gaming, Business, Thin & Light, etc.)
- Extract display dimensions
```
Output: 26+ engineered features

### 4️⃣ Exploratory Analysis → `notebooks/02_eda.ipynb`
```python
# Interactive visualizations
- Price distribution analysis
- Brand positioning
- Feature correlations
- Hardware trends
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Jupyter Notebook

### Installation

1. Clone the repository
```bash
git clone https://github.com/abhinavflac/laptops-specs-dataset.git
cd laptops-specs-dataset
```

2. Create virtual environment (optional)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Run the notebooks
```bash
jupyter notebook notebooks/
```

### Usage

**Option 1:** Use the cleaned dataset directly
```python
import pandas as pd

# Load cleaned data
df = pd.read_csv('data/processed/laptops_cleaned.csv')
print(df.shape)  # (992, 27)
```

**Option 2:** Run the complete pipeline
```python
# Open notebooks/01_data_cleaning.ipynb
# Run all cells to process raw data
```

## 📊 Dataset Summary

- **992** laptops (after cleaning)
- **27** engineered features
- **15+** brands (Lenovo, HP, Dell, Asus, Acer, Apple, etc.)
- **Price range:** ₹12,490 - ₹605,990

### Data Quality Improvements

✅ Extracted brand from model names  
✅ Parsed complex processor names (Intel Core Ultra, AMD Ryzen AI, Apple M-series)  
✅ Extracted numeric core counts from text (e.g., "20 Cores (8P + 12E)")  
✅ Classified GPU as integrated vs dedicated  
✅ Converted TB storage to GB  
✅ Standardized OS names  
✅ Handled missing warranty values  

## 🛠️ Tech Stack

### Core Technologies

- **Python 3.8+** - Programming language
- **Jupyter Notebook** - Interactive development
- **Pandas** - Data manipulation
- **NumPy** - Numerical operations
- **Regex** - Pattern matching for feature extraction

### Dependencies

```
pandas
numpy
jupyter
```

## 💡 Use Cases

### Portfolio Projects

- 📈 EDA dashboards (Streamlit, Plotly Dash)
- 🌐 Web applications for price prediction
- 📚 Teaching data cleaning workflows
- 🎓 Practice dataset for data science beginners

## 🧠 Technical Highlights

This project demonstrates:

### Data Engineering Skills

✅ Data Cleaning - 200+ lines of cleaning logic  
✅ Regex Mastery - Complex pattern extraction for CPU/GPU specs  
✅ Feature Engineering - Text to structured data transformation  
✅ Data Validation - Business rule implementation  
✅ ETL Pipeline - End-to-end reproducible workflow  

### Data Science Best Practices

✅ Reproducible pipeline with clear documentation  
✅ Raw data preservation (never modify source)  
✅ Systematic missing value handling  
✅ Feature engineering guided by domain knowledge  
✅ Data quality validation at each stage  

> **Note:** This project emphasizes that 80% of data science work is about understanding and preparing data correctly, not just building models.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

### Possible Enhancements

- [ ] Add more brands (international markets)
- [ ] Include battery specifications
- [ ] Add weight and dimensions
- [ ] Include launch dates for trend analysis
- [ ] Expand connectivity features (WiFi, Bluetooth versions)

Feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under **CC0 (Public Domain)**.  
You are free to use, modify, and distribute the data and code without restriction.

## 📧 Contact

- **Kaggle Dataset**: [Laptops Cleaned Dataset](https://www.kaggle.com/datasets/githubmasterin/laptops-cleaned-dataset)
- **GitHub**: [@abhinavflac](https://github.com/abhinavflac)
- **Repository**: [laptops-specs-dataset](https://github.com/abhinavflac/laptops-specs-dataset)

For questions or collaboration, feel free to open an issue!

## ⭐ Show Your Support

If this project helped you or you found it useful, please consider giving it a star!

---

Made with ❤️ for the Data Science community
