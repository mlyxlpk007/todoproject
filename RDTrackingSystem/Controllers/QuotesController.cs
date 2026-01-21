using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuotesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<QuotesController> _logger;

    public QuotesController(ApplicationDbContext context, ILogger<QuotesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetQuotes()
    {
        try
        {
            var quotes = await _context.ManagementQuotes.ToListAsync();
            var result = quotes.Select(q => new
            {
                id = q.Id,
                quote = q.Quote,
                category = q.Category,
                tags = q.Tags,
                displayCount = q.DisplayCount,
                createdAt = q.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = q.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取名言列表失败");
            return StatusCode(500, new { error = $"获取名言列表失败: {ex.Message}" });
        }
    }

    [HttpGet("random")]
    public async Task<ActionResult<object>> GetRandomQuote()
    {
        try
        {
            var quotes = await _context.ManagementQuotes.ToListAsync();
            if (quotes.Count == 0)
            {
                return NotFound(new { error = "没有可用的名言" });
            }

            var random = new Random();
            var quote = quotes[random.Next(quotes.Count)];

            // 更新显示次数
            quote.DisplayCount++;
            quote.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = quote.Id,
                quote = quote.Quote,
                category = quote.Category,
                tags = quote.Tags,
                displayCount = quote.DisplayCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取随机名言失败");
            return StatusCode(500, new { error = $"获取随机名言失败: {ex.Message}" });
        }
    }

    [HttpGet("random/{count}")]
    public async Task<ActionResult<IEnumerable<object>>> GetRandomQuotes(int count = 10)
    {
        try
        {
            var quotes = await _context.ManagementQuotes.ToListAsync();
            if (quotes.Count == 0)
            {
                return NotFound(new { error = "没有可用的名言" });
            }

            var random = new Random();
            var selectedQuotes = quotes.OrderBy(x => random.Next()).Take(Math.Min(count, quotes.Count)).ToList();

            // 更新显示次数
            foreach (var quote in selectedQuotes)
            {
                quote.DisplayCount++;
                quote.UpdatedAt = DateTime.Now;
            }
            await _context.SaveChangesAsync();

            var result = selectedQuotes.Select(q => new
            {
                id = q.Id,
                quote = q.Quote,
                category = q.Category,
                tags = q.Tags,
                displayCount = q.DisplayCount
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取随机名言失败");
            return StatusCode(500, new { error = $"获取随机名言失败: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateQuote([FromBody] dynamic quoteData)
    {
        try
        {
            if (quoteData == null)
            {
                return BadRequest(new { error = "名言数据为空" });
            }

            var quote = new ManagementQuote
            {
                Id = quoteData.id?.ToString() ?? Guid.NewGuid().ToString(),
                Quote = quoteData.quote?.ToString() ?? string.Empty,
                Category = quoteData.category?.ToString(),
                Tags = quoteData.tags?.ToString(),
                DisplayCount = 0,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.ManagementQuotes.Add(quote);
            await _context.SaveChangesAsync();

            return Ok(new { id = quote.Id, message = "名言创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建名言失败");
            return StatusCode(500, new { error = $"创建名言失败: {ex.Message}" });
        }
    }

    [HttpPost("batch")]
    public async Task<ActionResult<object>> CreateQuotesBatch([FromBody] dynamic quotesData)
    {
        try
        {
            if (quotesData == null || quotesData.quotes == null)
            {
                return BadRequest(new { error = "名言数据为空" });
            }

            var quotesList = quotesData.quotes as Newtonsoft.Json.Linq.JArray;
            if (quotesList == null)
            {
                return BadRequest(new { error = "名言数据格式错误" });
            }

            var quotes = new List<ManagementQuote>();
            foreach (var item in quotesList)
            {
                var quote = new ManagementQuote
                {
                    Id = Guid.NewGuid().ToString(),
                    Quote = item["quote"]?.ToString() ?? string.Empty,
                    Category = item["category"]?.ToString(),
                    Tags = item["tags"]?.ToString(),
                    DisplayCount = 0,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                quotes.Add(quote);
            }

            _context.ManagementQuotes.AddRange(quotes);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"成功创建 {quotes.Count} 条名言" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量创建名言失败");
            return StatusCode(500, new { error = $"批量创建名言失败: {ex.Message}" });
        }
    }
}
