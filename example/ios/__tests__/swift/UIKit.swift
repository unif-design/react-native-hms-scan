@_exported import Foundation

@_silgen_name("hmsscan_native_tests") private func runHmsScanNativeTests()

open class UIResponder: NSObject {}
public protocol UIApplicationDelegate {}
extension UIApplicationDelegate {
  // Replace UIApplicationMain at the external boundary, preserving @main.
  public static func main() { runHmsScanNativeTests() }
}
open class UIApplication: NSObject {
  public struct LaunchOptionsKey: Hashable { public init() {} }
}
open class UIScene: NSObject {
  public final class ConnectionOptions: NSObject {}
}
open class UIWindowScene: UIScene {}
open class UISceneSession: NSObject {}
public protocol UIWindowSceneDelegate {}
open class UIWindow: NSObject {
  public let windowScene: UIWindowScene
  public init(windowScene: UIWindowScene) { self.windowScene = windowScene }
}
open class UIOpenURLContext: NSObject {
  public let url: URL
  public init(url: URL) { self.url = url }
}
public enum Boundary {
  public static var events: [(String, [String: Any])] = []
  public static var bundle: URL? = URL(string: "http://localhost:8081/index.bundle")
  public static func record(_ name: String, _ values: [String: Any] = [:]) {
    events.append((name, values))
  }
}
