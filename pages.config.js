import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'
import { appName, primaryColor } from './src/settings/index.mjs'

const navBarBg = '#FFFFFF'
const navBarTextColor = '#3b82f6'
const pageBg = '#f8fafc'

export default defineUniPages({
  easycom: {
    autoscan: true,
    custom: {
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
      '^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)': 'z-paging/components/z-paging$1/z-paging$1.vue',
    },
  },
  pages: [
    {
      path: 'pages/index/index',
      aliasPath: '/index',
      name: 'index',
      style: {
        navigationStyle: 'custom',
        navigationBarTitleText: '主页面',
        navigationBarBackgroundColor: navBarBg,
        navigationBarTextStyle: navBarTextColor,
      },
    },
    {
      path: 'pages/goods/index',
      aliasPath: '/goods',
      name: 'goodsIndex',
      style: {
        navigationStyle: 'custom',
        navigationBarTitleText: '剧本管理',
        navigationBarBackgroundColor: navBarBg,
        navigationBarTextStyle: navBarTextColor,
      },
    },
    {
      path: 'pages/index/user/index',
      aliasPath: '/user',
      name: 'user',
      style: {
        navigationStyle: 'custom',
        navigationBarTitleText: '我的',
        navigationBarBackgroundColor: navBarBg,
        navigationBarTextStyle: navBarTextColor,
      },
    },
    {
      path: 'pages/login/index',
      aliasPath: '/login',
      name: 'login',
      style: {
        navigationStyle: 'custom',
        navigationBarTitleText: '登录',
        navigationBarBackgroundColor: navBarBg,
        navigationBarTextStyle: navBarTextColor,
      },
    },
  ],
  subPackages: [
    {
      root: 'pages/common',
      pages: [
        {
          path: 'web-view/index',
          aliasPath: '/web-view',
          name: 'web-view',
          style: {
            navigationBarTitleText: 'web-view',
            transparentTitle: 'auto',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
        {
          path: 'rich-view/index',
          aliasPath: '/rich-view',
          name: 'rich-view',
          style: {
            navigationBarTitleText: 'rich-view',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
      ],
    },
    // 新增：剧本管理子页面（库存、故事、任务）
    {
      root: 'pages/goods',
      pages: [
        {
          path: 'stock/index',
          aliasPath: '/goods/stock',
          name: 'goodsStock',
          style: {
            navigationBarTitleText: '货品库存',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
        {
          path: 'story/index',
          aliasPath: '/goods/story',
          name: 'goodsStory',
          style: {
            navigationBarTitleText: '货品故事',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
        {
          path: 'task/index',
          aliasPath: '/goods/task',
          name: 'goodsTask',
          style: {
            navigationBarTitleText: '任务配置',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
      ],
    },
    {
      root: 'pages/template',
      pages: [
        {
          path: 'paging/index',
          aliasPath: '/template-paging',
          name: 'template-paging',
          style: {
            navigationBarTitleText: '通用列表',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
      ],
    },
    {
      root: 'pages/personal',
      pages: [
        {
          path: 'index',
          aliasPath: '/personal',
          name: 'personal',
          style: {
            navigationBarTitleText: '个人资料',
            transparentTitle: 'auto',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
      ],
    },
    {
      root: 'pages/preference',
      pages: [
        {
          path: 'index',
          aliasPath: '/preference',
          name: 'preference',
          style: {
            navigationBarTitleText: '偏好设置',
            navigationBarBackgroundColor: navBarBg,
            navigationBarTextStyle: navBarTextColor,
          },
        },
      ],
    },
  ],
  tabBar: {
    color: '#9ca3af', // 未选中文字（淡灰，蓝白风格中性色）
    selectedColor: primaryColor || '#3b82f6', // 选中文字（蓝色主色）
    backgroundColor: '#FFFFFF', // 底部栏背景（白色）
    borderStyle: '#f0f2f5', // 底部栏边框（淡蓝灰，弱化割裂感）
    list: [
      {
        iconPath: 'static/images/tabbar/home.png',
        selectedIconPath: 'static/images/tabbar/home-active.png',
        pagePath: 'pages/index/index',
        text: '主页面',
      },
      {
        iconPath: 'static/images/tabbar/goods.png', // 新增：剧本管理图标
        selectedIconPath: 'static/images/tabbar/goods-active.png',
        pagePath: 'pages/goods/index',
        text: '剧本管理',
      },
      {
        iconPath: 'static/images/tabbar/user.png',
        selectedIconPath: 'static/images/tabbar/user-active.png',
        pagePath: 'pages/index/user/index',
        text: '我的',
      },
    ],
  },
  globalStyle: {
    navigationBarTitleText: appName,
    navigationBarBackgroundColor: navBarBg,
    navigationBarTextStyle: navBarTextColor,
    backgroundColor: pageBg, // 页面背景改为淡蓝灰，更贴合蓝白风格
  },
})
