# InvestBI API

## Overview

InvestBI API is a comprehensive financial data API that provides access to various market data including stocks, commodities, funds, and exchange rates.

## Features

- Real-time stock data for Turkish and US markets
- Commodity price tracking
- Fund information and pricing
- Exchange rate data from multiple sources
- Advanced web scraping capabilities

## API Endpoints

### Exchange Rates

#### Traditional TCMB Exchange Rates

- `GET /api/v1/exchange` - Get all exchange rates from TCMB (Turkish Central Bank)
- `GET /api/v1/exchange/rates` - Get currency conversion rates

#### TradingView Exchange Rates (New!)

- `GET /api/v1/exchange/tradingview` - Get real-time currency pair data from TradingView
- `GET /api/v1/exchange/tradingview/all` - Get all TradingView currency pairs with search capability

The TradingView endpoints provide:

- Real-time currency pair prices
- Change and change percentage data
- Currency pair descriptions
- Icons/flags for currencies
- Support for major, minor, and exotic currency pairs

### Other Endpoints

- `GET /api/v1/stocks` - Stock market data
- `GET /api/v1/commodities` - Commodity prices
- `GET /api/v1/funds` - Fund information
- `GET /api/v1/indices` - Market indices

## Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

## Technologies Used

- Node.js with TypeScript
- Express.js framework
- Puppeteer for web scraping
- MongoDB with Mongoose
- Docker support

## TradingView Integration

The API now includes specialized scraping for TradingView's currency markets, providing:

- Real-time forex data
- Comprehensive currency pair coverage
- Automated data loading and pagination
- Efficient browser resource management
