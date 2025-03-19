# MKBakery Admin Panel

A Progressive Web App (PWA) for managing bakery products
Manage bakery products with Create/Read/Update/Delete functionality

Native Device Integration
Camera access ∙ Geolocation tracking ∙ Push notifications

Offline-First Approach
Works without internet using service workers

Real-Time Updates
Instant content synchronization with client-side PWA

Extensible Architecture
Modular components for future feature expansion

 1. The application is for a bakery, the admin control side.                                                             
 2. It is for updating and controlling content of the other pwa (client side).                                           
 3. It has capabilitities to perform CRUD functions.                                                                     
 4. It is capable of using device native capabilities e.g geolocation extraction, taking pictures and push notifications.
 5. It open and suitable for expandition.                                                                                

## 1. Clone repository
git clone https://github.com/markaldo/pwa-admin.git

## 2. Install dependencies
npm install

## 3. Configure environment variables
cp .env.example .env.local

## 4. Start development server
npm start

## 5. Build for production
npm run build
