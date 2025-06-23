// Web環境用のreact-native-mapsモックモジュール
// Web環境ではreact-native-mapsは使用せず、代わりにreact-leafletを使用します

const MockComponent = () => null;

module.exports = {
  default: MockComponent,
  MapView: MockComponent,
  Marker: MockComponent,
  Circle: MockComponent,
  Polyline: MockComponent,
  Polygon: MockComponent,
  Callout: MockComponent,
  __esModule: true,
};

// ES6 export support
module.exports.default = MockComponent; 