# Keep rules for HUAWEI Scan Kit (Scan SDK-Plus). Shipped to the consuming app via
# consumerProguardFiles so release (minified) builds keep the HMS reflection targets.
# Mirrors the official hms-scan-demo proguard configuration.
-ignorewarnings
-keepattributes *Annotation*
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable

-keep class com.huawei.hianalytics.**{*;}
-keep class com.huawei.updatesdk.**{*;}
-keep class com.huawei.hms.**{*;}
