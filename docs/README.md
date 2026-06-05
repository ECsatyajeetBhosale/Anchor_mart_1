# Documentation

This folder contains comprehensive documentation for the Anchor Mart admin dashboard features and infrastructure.

## 📚 Documentation Files

### Features

#### [DASHBOARD.md](./DASHBOARD.md)
Complete guide to the Dashboard feature displaying key business metrics.
- Quick start (2 minutes)
- API integration
- Component structure
- Customization guide
- Troubleshooting

#### [COUPONS.md](./COUPONS.md)
Complete guide to the Coupons Management feature.
- Quick start (5 minutes)
- Features overview
- Component hierarchy
- State management
- API integration
- Search & filters
- Customization guide
- 50+ utility functions
- Troubleshooting

### Infrastructure

#### [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md)
Guide to fixing CORS issues with backend API integration.
- Problem explanation
- Solutions for Django, Flask, Express, FastAPI
- Testing & verification
- Production deployment
- Troubleshooting

#### [PROJECT_RULES.md](../PROJECT_RULES.md)
Project-wide conventions and best practices.
- Code structure
- State management
- Forms & validation
- API & routes
- Styling
- Components
- Testing
- Language & i18n

## 🚀 Quick Navigation

### I want to...

**Use the Dashboard**
→ See [DASHBOARD.md](./DASHBOARD.md) - Quick Start section

**Use the Coupons Feature**
→ See [COUPONS.md](./COUPONS.md) - Quick Start section

**Fix CORS Errors**
→ See [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md)

**Understand Project Rules**
→ See [PROJECT_RULES.md](../PROJECT_RULES.md)

**Customize a Feature**
→ See the Customization section in [DASHBOARD.md](./DASHBOARD.md) or [COUPONS.md](./COUPONS.md)

**Troubleshoot an Issue**
→ See the Troubleshooting section in the relevant feature guide

## 📋 File Organization

```
docs/
├── README.md                    # This file
├── DASHBOARD.md                 # Dashboard feature guide
├── COUPONS.md                   # Coupons feature guide
└── CORS_FIX_GUIDE.md           # CORS troubleshooting guide

root/
└── PROJECT_RULES.md             # Project conventions
```

## 🎯 Feature Status

### Dashboard ✅
- **Status:** Complete and ready to use
- **Features:** 4 metric cards, responsive grid, error handling
- **API Integration:** RTK Query with mock data fallback
- **Tests:** 6/6 passing

### Coupons ✅
- **Status:** Complete and ready to use
- **Features:** Table view, search, filters, pagination, CRUD operations
- **Components:** 15 components, 3 hooks, 50+ utilities
- **Tests:** Comprehensive test coverage

## 🔧 Common Tasks

### Add a New Metric to Dashboard
1. Update type in `src/features/dashboard/types/dashboard.types.ts`
2. Update API in `src/features/dashboard/api/dashboardApi.ts`
3. Add card in `src/features/dashboard/components/DashboardGrid.tsx`
4. Add message in `src/lib/messages.ts`

See [DASHBOARD.md](./DASHBOARD.md) - Customization section

### Add a New Filter to Coupons
1. Update type in `src/features/coupons/types/coupon.ts`
2. Update hook in `src/features/coupons/hooks/useCouponFilters.ts`
3. Add filter UI in `src/features/coupons/components/CouponsFilters.tsx`
4. Update API call in `src/features/coupons/api/couponsApi.ts`

See [COUPONS.md](./COUPONS.md) - Customization section

### Fix CORS Issues
1. Identify your backend framework (Django, Flask, Express, FastAPI)
2. Follow the instructions in [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md)
3. Restart backend server
4. Refresh dashboard

## 📊 Documentation Statistics

| Document | Lines | Topics | Status |
|----------|-------|--------|--------|
| DASHBOARD.md | 400+ | 20+ | ✅ Complete |
| COUPONS.md | 600+ | 30+ | ✅ Complete |
| CORS_FIX_GUIDE.md | 300+ | 15+ | ✅ Complete |
| PROJECT_RULES.md | 100+ | 10+ | ✅ Complete |

**Total:** 1,400+ lines of documentation

## 🎓 Learning Path

### For New Developers

1. **Start here:** [PROJECT_RULES.md](../PROJECT_RULES.md)
   - Understand project conventions
   - Learn code structure
   - Review best practices

2. **Then explore:** [DASHBOARD.md](./DASHBOARD.md)
   - See a complete feature
   - Understand architecture
   - Learn how to customize

3. **Then explore:** [COUPONS.md](./COUPONS.md)
   - See a complex feature
   - Learn advanced patterns
   - Understand state management

4. **Reference:** [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md)
   - Troubleshoot issues
   - Understand API integration

### For Feature Development

1. Review the relevant feature guide (DASHBOARD.md or COUPONS.md)
2. Check PROJECT_RULES.md for conventions
3. Follow the file structure and patterns
4. Use the customization guide for your changes

### For Troubleshooting

1. Check the Troubleshooting section in the relevant guide
2. Review CORS_FIX_GUIDE.md if it's an API issue
3. Check browser console for error messages
4. Check Network tab in DevTools

## 🔍 Search Guide

### By Topic

**API Integration**
- DASHBOARD.md - API Integration section
- COUPONS.md - API Integration section
- CORS_FIX_GUIDE.md - Entire document

**State Management**
- COUPONS.md - State Management section
- DASHBOARD.md - State Management section

**Components**
- DASHBOARD.md - Components section
- COUPONS.md - Component Hierarchy section

**Styling**
- DASHBOARD.md - Styling section
- COUPONS.md - Responsive Design section
- PROJECT_RULES.md - Styling section

**Testing**
- DASHBOARD.md - Testing section
- COUPONS.md - Testing section
- PROJECT_RULES.md - Testing section

**Customization**
- DASHBOARD.md - Customization section
- COUPONS.md - Customization section

**Troubleshooting**
- DASHBOARD.md - Troubleshooting section
- COUPONS.md - Troubleshooting section
- CORS_FIX_GUIDE.md - Troubleshooting section

## 📞 Support

### If You Have Questions

1. **Check the relevant feature guide** (DASHBOARD.md or COUPONS.md)
2. **Check PROJECT_RULES.md** for conventions
3. **Check CORS_FIX_GUIDE.md** for API issues
4. **Check the Troubleshooting section** in the relevant guide

### If You Find an Issue

1. Check the browser console for error messages
2. Check the Network tab in DevTools
3. Review the Troubleshooting section
4. Check backend logs if it's an API issue

### If You Need to Extend

1. Review the relevant feature guide
2. Follow the patterns and conventions
3. Check PROJECT_RULES.md for best practices
4. Test your changes thoroughly

## 🎯 Next Steps

- **To use Dashboard:** See [DASHBOARD.md](./DASHBOARD.md) - Quick Start
- **To use Coupons:** See [COUPONS.md](./COUPONS.md) - Quick Start
- **To fix CORS:** See [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md)
- **To understand project:** See [PROJECT_RULES.md](../PROJECT_RULES.md)

## 📝 Documentation Maintenance

These documents are maintained and updated as features evolve. Last updated: May 18, 2026

---

**Happy coding! 🚀**
