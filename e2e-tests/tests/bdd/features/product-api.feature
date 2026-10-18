Feature: Kiểm thử tự động REST API Sản phẩm với MongoDB và Redis

  Scenario: TC01 - Health Check kiểm tra Server, MongoDB và Redis đều sẵn sàng
    When Tôi gửi yêu cầu GET tới "/health"
    Then Mã trạng thái phản hồi phải là 200
    And Trạng thái hệ thống phải là "ok" với MongoDB và Redis sẵn sàng

  Scenario: TC02 - Tạo sản phẩm mới, kiểm tra đồng thời MongoDB và Redis
    When Tôi gửi yêu cầu tạo sản phẩm với ID "prod_bdd_001", tên "Tai nghe BDD Sony", giá 6990000
    Then Mã trạng thái phản hồi phải là 201
    And Dữ liệu sản phẩm trả về phải khớp với thông tin vừa tạo
    And Sản phẩm với ID "prod_bdd_001" phải tồn tại trong MongoDB với tên "Tai nghe BDD Sony" và giá 6990000
    And Sản phẩm với ID "prod_bdd_001" phải tồn tại trong Redis cache và có TTL lớn hơn 0

  Scenario: TC03 - Kiểm tra cơ chế Cache Aside (Cache Hit và Cache Miss)
    Given Một sản phẩm đã tồn tại với ID "prod_cache_bdd", tên "Chuột BDD MX Master", giá 2100000
    When Tôi gửi yêu cầu lấy thông tin sản phẩm với ID "prod_cache_bdd"
    Then Mã trạng thái phản hồi phải là 200
    And Tiêu đề "X-Cache" trong phản hồi phải là "HIT"
    When Tôi xóa trực tiếp cache của sản phẩm "prod_cache_bdd" trong Redis
    And Tôi gửi yêu cầu lấy thông tin sản phẩm với ID "prod_cache_bdd"
    Then Mã trạng thái phản hồi phải là 200
    And Tiêu đề "X-Cache" trong phản hồi phải là "MISS"
    And Sản phẩm "prod_cache_bdd" phải được tự động nạp lại vào Redis cache

  Scenario: TC04 - Xóa sản phẩm và xác minh biến mất ở cả MongoDB và Redis
    Given Một sản phẩm đã tồn tại với ID "prod_del_bdd", tên "Bàn phím BDD Akko", giá 950000
    When Tôi gửi yêu cầu xóa sản phẩm với ID "prod_del_bdd"
    Then Mã trạng thái phản hồi phải là 200
    And Sản phẩm với ID "prod_del_bdd" không còn tồn tại trong MongoDB
    And Cache của sản phẩm "prod_del_bdd" không còn tồn tại trong Redis
